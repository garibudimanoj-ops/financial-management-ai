import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';
import { toDecimal, DecimalLike } from '@/lib/inventory/valuation';
import { calculateInvoiceTotals, calculateBalanceDue } from './calculations';
import { recordLedgerEntry } from '@/lib/customers/service';
import { recordSaleInvoiceJournal, recordPaymentJournal, reverseSourceJournal } from '@/services/accounting/journalBridge';
import { InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client';

export interface SalePaymentInput {
  amount: DecimalLike;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export interface FinalizeSaleItemInput {
  productId: string;
  quantity: DecimalLike;
  unitPrice: DecimalLike;
  discount?: DecimalLike;
  taxRate?: DecimalLike;
  taxCategory?: string | null;
}

export interface FinalizeSaleInput {
  businessId: string;
  customerId?: string | null;
  items: FinalizeSaleItemInput[];
  invoiceDiscount?: DecimalLike;
  dueDate?: Date | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  status?: 'DRAFT' | 'ISSUED' | 'PAID';
  initialPayment?: SalePaymentInput | null;
  initialPayments?: SalePaymentInput[] | null;
  userId: string;
}

export interface CancelInvoiceInput {
  businessId: string;
  invoiceId: string;
  reason: string;
  userId: string;
}

/**
 * Cancels an invoice with a production-safe, idempotent-by-status workflow.
 *
 * - DRAFT: marks CANCELLED. No stock was ever deducted and no journal was posted,
 *   so inventory, General Ledger, and customer ledger are left untouched.
 * - ISSUED (unpaid): returns stock to inventory per line item, reverses the posted
 *   sale journal exactly once via the shared reverseSourceJournal mechanism, and
 *   offsets the customer receivable so the cached balance stays correct.
 * - PAID / PARTIALLY_PAID: rejected. Payments must be reversed/refunded first so
 *   paidAmount is never silently altered.
 * - CANCELLED / REFUNDED: rejected to prevent duplicate cancellation or reversal.
 */
export async function cancelInvoice(input: CancelInvoiceInput) {
  if (!input.reason || input.reason.trim() === '') {
    throw new AppError('A cancellation reason is required', 'VALIDATION_ERROR');
  }

  let previousStatus: InvoiceStatus | undefined;

  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { items: true },
    });

    if (!invoice || invoice.businessId !== input.businessId) {
      throw new AppError('Invoice not found in this business', 'NOT_FOUND');
    }

    if (invoice.status === 'CANCELLED') {
      throw new AppError('Invoice is already cancelled', 'VALIDATION_ERROR');
    }
    if (invoice.status === 'REFUNDED') {
      throw new AppError('Cannot cancel a refunded invoice; refunds are final', 'VALIDATION_ERROR');
    }
    if (invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') {
      throw new AppError(
        `Cannot cancel invoice with status ${invoice.status}. Reverse or refund recorded payments first.`,
        'VALIDATION_ERROR'
      );
    }

    previousStatus = invoice.status;

    // DRAFT: nothing was ever deducted or posted. Just mark cancelled.
    if (previousStatus === 'DRAFT') {
      return await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'CANCELLED' },
      });
    }

    // ISSUED (unpaid): restore inventory and reverse the sale journal.
    for (const item of invoice.items) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || product.businessId !== input.businessId) {
        throw new AppError(`Product '${item.productNameSnapshot}' not found`, 'NOT_FOUND');
      }

      const previousStock = product.stockQuantity;
      const resultingStock = previousStock.plus(item.quantity);

      await tx.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: resultingStock,
          updatedById: input.userId,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId: input.businessId,
          productId: product.id,
          movementType: 'RETURN',
          quantity: item.quantity,
          unitCost: product.costPrice,
          previousStock,
          resultingStock,
          reason: `Invoice #${invoice.invoiceNumber} cancelled: ${input.reason}`,
          reference: invoice.invoiceNumber,
          createdById: input.userId,
        },
      });
    }

    // Reverse the posted sale journal exactly once. The shared mechanism finds the
    // original INVOICE-sourced transaction and creates an equal-and-opposite reversal.
    const saleTxn = await tx.transaction.findFirst({
      where: {
        businessId: input.businessId,
        sourceType: 'INVOICE',
        sourceId: invoice.id,
        status: 'POSTED',
      },
    });

    if (saleTxn) {
      const existingReversal = await tx.transaction.findFirst({
        where: { reversalOfId: saleTxn.id },
      });
      if (existingReversal) {
        throw new AppError('Sale journal for this invoice was already reversed', 'CONFLICT');
      }
    }

    const reversal = await reverseSourceJournal(tx, {
      businessId: input.businessId,
      sourceType: 'INVOICE',
      sourceId: invoice.id,
      reversalSourceType: 'INVOICE_CANCELLATION',
      reference: invoice.invoiceNumber,
      description: `Cancellation of Invoice #${invoice.invoiceNumber}: ${input.reason}`,
      userId: input.userId,
    });

    if (!reversal) {
      throw new AppError('Posted sale journal for this invoice was not found', 'NOT_FOUND');
    }

    // Offset the original INVOICE receivable so the customer's cached balance
    // reflects that they no longer owe on a voided invoice.
    if (invoice.customerId) {
      await recordLedgerEntry(tx, {
        businessId: input.businessId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        entryType: 'CREDIT',
        amount: invoice.totalAmount,
        description: `Invoice #${invoice.invoiceNumber} cancelled: ${input.reason}`,
        reference: invoice.invoiceNumber,
        userId: input.userId,
      });
    }

    return await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: 'CANCELLED' },
    });
  }).then(async (result) => {
    await logAuditEvent({
      action: 'INVOICE_CANCEL',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        invoiceId: result.id,
        invoiceNumber: result.invoiceNumber,
        previousStatus,
        reason: input.reason,
      },
    });

    return result;
  });
}

export interface RecordPaymentInput {
  businessId: string;
  invoiceId: string;
  amount: DecimalLike;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  userId: string;
}

export interface RefundInvoiceInput {
  businessId: string;
  invoiceId: string;
  returnStockToInventory?: boolean;
  reason: string;
  userId: string;
}

/**
 * Generates a collision-free, incrementing business-scoped invoice number.
 */
export async function generateNextInvoiceNumber(
  tx: Prisma.TransactionClient,
  businessId: string,
  prefix = 'INV'
): Promise<string> {
  const sequence = await tx.invoiceSequence.upsert({
    where: { businessId },
    create: {
      businessId,
      prefix,
      currentNumber: 1,
    },
    update: {
      currentNumber: {
        increment: 1,
      },
    },
  });

  return `${sequence.prefix}-${String(sequence.currentNumber).padStart(5, '0')}`;
}

/**
 * Atomically finalizes a sale / creates an invoice with:
 * - Inventory deduction (`SALE` movements)
 * - Snapshot line items
 * - Customer ledger posting
 * - Optional immediate payment settlement
 * - Audit log registration
 */
export async function finalizeSale(input: FinalizeSaleInput) {
  if (input.items.length === 0) {
    throw new AppError('Sale must contain at least one item', 'VALIDATION_ERROR');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Check idempotency
    if (input.idempotencyKey) {
      const existing = await tx.invoice.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId: input.businessId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: {
          items: true,
          payments: true,
          customer: true,
        },
      });

      if (existing) {
        return existing;
      }
    }

    const checkoutPayments: SalePaymentInput[] = [];
    if (input.initialPayment && toDecimal(input.initialPayment.amount).greaterThan(0)) {
      checkoutPayments.push(input.initialPayment);
    }
    if (input.initialPayments) {
      for (const payment of input.initialPayments) {
        if (toDecimal(payment.amount).greaterThan(0)) {
          checkoutPayments.push(payment);
        }
      }
    }

    // 2. Validate customer if supplied
    let customerRecord = null;
    if (input.customerId) {
      customerRecord = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customerRecord || customerRecord.businessId !== input.businessId) {
        throw new AppError('Customer not found in this business', 'NOT_FOUND');
      }
      if (customerRecord.archived) {
        throw new AppError('Cannot assign invoices to an archived customer', 'VALIDATION_ERROR');
      }
    }

    // 3. Fetch all products and verify business ownership
    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        businessId: input.businessId,
      },
    });

    if (products.length !== productIds.length) {
      throw new AppError('One or more selected products do not belong to this business', 'FORBIDDEN');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 4. Calculate authoritative server-side totals
    const calculatedTotals = calculateInvoiceTotals({
      items: input.items.map((item) => {
        const prod = productMap.get(item.productId)!;
        return {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
          taxCategory: item.taxCategory || prod.taxCategory,
        };
      }),
      invoiceDiscount: input.invoiceDiscount,
    });

    const isIssuedOrPaid = input.status === 'ISSUED' || input.status === 'PAID' || !input.status;

    let initialPaid = new Prisma.Decimal(0);
    for (const payment of checkoutPayments) {
      initialPaid = initialPaid.plus(toDecimal(payment.amount));
    }

    const totalAmount = calculatedTotals.totalAmount;
    if (initialPaid.greaterThan(totalAmount)) {
      throw new AppError(
        `Payment total (${initialPaid.toString()}) exceeds invoice total (${totalAmount.toString()})`,
        'VALIDATION_ERROR'
      );
    }

    const balanceDue = calculateBalanceDue(totalAmount, initialPaid);

    if (balanceDue.greaterThan(0) && !input.customerId) {
      throw new AppError('Walk-in sales must be paid in full. Select a customer for credit or split-with-balance sales.', 'VALIDATION_ERROR');
    }

    if (customerRecord && isIssuedOrPaid && balanceDue.greaterThan(0) && customerRecord.creditLimit) {
      const projectedBalance = customerRecord.currentBalance.plus(balanceDue);
      if (projectedBalance.greaterThan(customerRecord.creditLimit)) {
        throw new AppError(
          `Credit sale exceeds customer credit limit. Limit ${customerRecord.creditLimit.toString()}, projected balance ${projectedBalance.toString()}`,
          'VALIDATION_ERROR'
        );
      }
    }

    let finalStatus: InvoiceStatus = input.status === 'DRAFT' ? 'DRAFT' : 'ISSUED';
    if (isIssuedOrPaid) {
      if (balanceDue.isZero() && totalAmount.greaterThan(0)) {
        finalStatus = 'PAID';
      } else if (initialPaid.greaterThan(0)) {
        finalStatus = 'PARTIALLY_PAID';
      } else {
        finalStatus = 'ISSUED';
      }
    }

    // 5. Generate collision-free invoice number before stock movements so they can reference it
    const invoiceNumber = await generateNextInvoiceNumber(tx, input.businessId);

    // 6. If issued/paid, verify stock and deduct inventory atomically
    if (isIssuedOrPaid) {
      for (const item of input.items) {
        const product = productMap.get(item.productId)!;
        const requestedQty = toDecimal(item.quantity);

        if (requestedQty.lessThanOrEqualTo(0)) {
          throw new AppError(`Item quantity for '${product.name}' must be greater than zero`, 'VALIDATION_ERROR');
        }

        if (product.stockQuantity.lessThan(requestedQty)) {
          throw new AppError(
            `Insufficient stock for '${product.name}': Available ${product.stockQuantity.toString()}, requested ${requestedQty.toString()}`,
            'VALIDATION_ERROR'
          );
        }

        const previousStock = product.stockQuantity;
        const resultingStock = previousStock.minus(requestedQty);
        product.stockQuantity = resultingStock;

        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: resultingStock,
            updatedById: input.userId,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            businessId: input.businessId,
            productId: product.id,
            movementType: 'SALE',
            quantity: requestedQty,
            unitCost: product.costPrice,
            previousStock,
            resultingStock,
            reason: `POS / Sales invoice #${invoiceNumber}`,
            reference: invoiceNumber,
            createdById: input.userId,
          },
        });
      }
    }

    // 7. Create Invoice
    const invoice = await tx.invoice.create({
      data: {
        businessId: input.businessId,
        customerId: input.customerId || null,
        invoiceNumber,
        status: finalStatus,
        issueDate: new Date(),
        dueDate: input.dueDate || null,
        subtotal: calculatedTotals.subtotal,
        discountAmount: calculatedTotals.discountAmount,
        taxAmount: calculatedTotals.taxAmount,
        totalAmount,
        paidAmount: initialPaid,
        balanceDue,
        notes: input.notes || null,
        idempotencyKey: input.idempotencyKey || null,
        createdById: input.userId,
      },
    });

    // 8. Create InvoiceItems with historical snapshots
    let totalCostOfGoods = new Prisma.Decimal(0);
    for (let i = 0; i < input.items.length; i++) {
      const rawItem = input.items[i];
      const product = productMap.get(rawItem.productId)!;
      const computed = calculatedTotals.computedItems[i];
      totalCostOfGoods = totalCostOfGoods.plus(product.costPrice.mul(computed.quantity));

      await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          productId: product.id,
          productNameSnapshot: product.name,
          skuSnapshot: product.SKU,
          unitSnapshot: product.unit,
          quantity: computed.quantity,
          unitPrice: computed.unitPrice,
          unitCostSnapshot: product.costPrice,
          discount: computed.discount,
          taxRate: computed.taxRate,
          taxAmount: computed.taxAmount,
          lineSubtotal: computed.lineSubtotal,
          lineTotal: computed.lineTotal,
        },
      });
    }

    // 9. Customer Ledger integration: Record invoice receivable
    if (input.customerId && isIssuedOrPaid) {
      await recordLedgerEntry(tx, {
        businessId: input.businessId,
        customerId: input.customerId,
        invoiceId: invoice.id,
        entryType: 'INVOICE',
        amount: totalAmount,
        description: `Invoice issued #${invoiceNumber}`,
        reference: invoiceNumber,
        userId: input.userId,
      });
    }

    // 10. Record checkout payment(s) — supports cash/card/UPI and split tender
    const splitTender = checkoutPayments.length > 1;
    for (const checkoutPayment of checkoutPayments) {
      const payAmount = toDecimal(checkoutPayment.amount);
      const payment = await tx.payment.create({
        data: {
          businessId: input.businessId,
          invoiceId: invoice.id,
          customerId: input.customerId || null,
          amount: payAmount,
          paymentMethod: checkoutPayment.paymentMethod,
          reference: checkoutPayment.reference || null,
          notes: checkoutPayment.notes || 'POS checkout payment',
          createdById: input.userId,
        },
      });

      if (input.customerId) {
        await recordLedgerEntry(tx, {
          businessId: input.businessId,
          customerId: input.customerId,
          invoiceId: invoice.id,
          paymentId: payment.id,
          entryType: 'PAYMENT',
          amount: payAmount,
          description: `Payment received for Invoice #${invoiceNumber} (${checkoutPayment.paymentMethod})`,
          reference: payment.reference || invoiceNumber,
          userId: input.userId,
        });
      }

      if (isIssuedOrPaid && splitTender) {
        await recordPaymentJournal(tx, {
          businessId: input.businessId,
          paymentId: payment.id,
          invoiceNumber,
          amount: payAmount,
          paymentMethod: checkoutPayment.paymentMethod,
          userId: input.userId,
        });
      }
    }

    // 11. General Ledger: sale journal. Split tender posts the full invoice to AR, then cash/bank via payment journals.
    if (isIssuedOrPaid) {
      await recordSaleInvoiceJournal(tx, {
        businessId: input.businessId,
        invoiceId: invoice.id,
        invoiceNumber,
        subtotal: calculatedTotals.subtotal,
        discountAmount: calculatedTotals.discountAmount,
        taxAmount: calculatedTotals.taxAmount,
        totalAmount,
        totalCostOfGoods,
        initialPaid: splitTender ? new Prisma.Decimal(0) : initialPaid,
        paymentMethod: splitTender ? undefined : checkoutPayments[0]?.paymentMethod,
        userId: input.userId,
      });
    }

    return invoice;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'INVOICE_CREATE',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        invoiceId: result.id,
        invoiceNumber: result.invoiceNumber,
        totalAmount: result.totalAmount.toString(),
        status: result.status,
      },
    });

    return result;
  });
}

/**
 * Records a payment against an issued invoice and updates status & customer balance.
 */
export async function recordInvoicePayment(input: RecordPaymentInput) {
  const payAmount = toDecimal(input.amount);

  if (payAmount.lessThanOrEqualTo(0)) {
    throw new AppError('Payment amount must be greater than zero', 'VALIDATION_ERROR');
  }

  return await prisma.$transaction(async (tx) => {
    // Check idempotency
    if (input.idempotencyKey) {
      const existing = await tx.payment.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId: input.businessId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
    });

    if (!invoice || invoice.businessId !== input.businessId) {
      throw new AppError('Invoice not found in this business', 'NOT_FOUND');
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
      throw new AppError(`Cannot accept payment for an invoice with status ${invoice.status}`, 'VALIDATION_ERROR');
    }

    if (invoice.status === 'DRAFT') {
      throw new AppError('Cannot record payment for a draft invoice. Please issue the invoice first.', 'VALIDATION_ERROR');
    }

    const remainingBalance = invoice.balanceDue;

    if (payAmount.greaterThan(remainingBalance)) {
      throw new AppError(
        `Payment amount (${payAmount.toString()}) exceeds balance due (${remainingBalance.toString()})`,
        'VALIDATION_ERROR'
      );
    }

    const newPaidAmount = invoice.paidAmount.plus(payAmount);
    const newBalanceDue = calculateBalanceDue(invoice.totalAmount, newPaidAmount);
    const newStatus: InvoiceStatus = newBalanceDue.isZero() ? 'PAID' : 'PARTIALLY_PAID';

    const payment = await tx.payment.create({
      data: {
        businessId: input.businessId,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: payAmount,
        paymentMethod: input.paymentMethod,
        reference: input.reference || null,
        notes: input.notes || null,
        idempotencyKey: input.idempotencyKey || null,
        createdById: input.userId,
      },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
    });

    if (invoice.customerId) {
      await recordLedgerEntry(tx, {
        businessId: input.businessId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        paymentId: payment.id,
        entryType: 'PAYMENT',
        amount: payAmount,
        description: `Payment received for Invoice #${invoice.invoiceNumber}`,
        reference: input.reference || invoice.invoiceNumber,
        userId: input.userId,
      });
    }

    // General Ledger integration: Post double-entry journal
    await recordPaymentJournal(tx, {
      businessId: input.businessId,
      paymentId: payment.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: payAmount,
      paymentMethod: input.paymentMethod,
      userId: input.userId,
    });

    return payment;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'PAYMENT_CREATE',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        paymentId: result.id,
        invoiceId: input.invoiceId,
        amount: input.amount.toString(),
        method: input.paymentMethod,
      },
    });

    return result;
  });
}

export interface ReversePaymentInput {
  businessId: string;
  paymentId: string;
  reason: string;
  userId: string;
}

/**
 * Reverses a previously recorded customer invoice payment.
 *
 * This is the inverse of recordInvoicePayment and reuses the same primitives:
 * - The customer ledger entry created by the original PAYMENT is offset with a
 *   DEBIT entry (recordLedgerEntry), restoring the customer's outstanding balance.
 * - The original PAYMENT-sourced General Ledger transaction is reversed exactly
 *   once via the shared reverseSourceJournal mechanism, keeping debits and
 *   credits balanced and preventing double reversal.
 * - The invoice paidAmount is reduced and its status recalculated.
 * - The original Payment record is NOT deleted; it is marked with reversal
 *   metadata so the audit trail is preserved.
 *
 * The entire workflow runs in a single Prisma transaction, so a failure leaves
 * no partially reversed state.
 */
export async function reversePayment(input: ReversePaymentInput) {
  if (!input.reason || input.reason.trim() === '') {
    throw new AppError('A reversal reason is required', 'VALIDATION_ERROR');
  }

  let originalStatus: InvoiceStatus | undefined;

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: input.paymentId },
    });

    if (!payment || payment.businessId !== input.businessId) {
      throw new AppError('Payment not found in this business', 'NOT_FOUND');
    }

    if (payment.reversedAt) {
      throw new AppError('Payment has already been reversed', 'VALIDATION_ERROR');
    }

    if (!payment.invoiceId) {
      throw new AppError('Payment is not linked to an invoice and cannot be reversed', 'VALIDATION_ERROR');
    }

    const invoice = await tx.invoice.findUnique({
      where: { id: payment.invoiceId },
    });

    if (!invoice || invoice.businessId !== input.businessId) {
      throw new AppError('Invoice not found in this business', 'NOT_FOUND');
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
      throw new AppError(`Cannot reverse a payment against an invoice with status ${invoice.status}`, 'VALIDATION_ERROR');
    }

    originalStatus = invoice.status;

    const payAmount = payment.amount;
    const newPaidAmount = invoice.paidAmount.minus(payAmount);
    if (newPaidAmount.lessThan(0)) {
      throw new AppError(
        `Cannot reverse payment: invoice paidAmount (${invoice.paidAmount.toString()}) is less than the payment amount (${payAmount.toString()})`,
        'VALIDATION_ERROR'
      );
    }

    const newBalanceDue = calculateBalanceDue(invoice.totalAmount, newPaidAmount);
    const newStatus: InvoiceStatus = newBalanceDue.isZero()
      ? 'PAID'
      : newPaidAmount.isZero()
        ? 'ISSUED'
        : 'PARTIALLY_PAID';

    // Reverse the posted payment journal exactly once. The shared mechanism finds
    // the original PAYMENT-sourced transaction and creates an equal-and-opposite
    // reversal, updating account balances. Returns null only if the original was
    // never posted — which is a hard failure here, because a recorded payment must
    // have produced a balanced journal.
    const reversal = await reverseSourceJournal(tx, {
      businessId: input.businessId,
      sourceType: 'PAYMENT',
      sourceId: payment.id,
      reversalSourceType: 'PAYMENT_REVERSAL',
      reference: payment.reference || invoice.invoiceNumber,
      description: `Payment reversal for Invoice #${invoice.invoiceNumber}: ${input.reason}`,
      userId: input.userId,
    });

    if (!reversal) {
      throw new AppError('Posted payment journal for this payment was not found', 'NOT_FOUND');
    }

    // Offset the original PAYMENT customer-ledger entry so the cached balance
    // reflects that the customer no longer paid on a voided payment.
    if (invoice.customerId) {
      await recordLedgerEntry(tx, {
        businessId: input.businessId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        paymentId: payment.id,
        entryType: 'DEBIT',
        amount: payAmount,
        description: `Payment reversed for Invoice #${invoice.invoiceNumber}: ${input.reason}`,
        reference: payment.reference || invoice.invoiceNumber,
        userId: input.userId,
      });
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
    });

    const reversedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        reversedAt: new Date(),
        reversedById: input.userId,
        reversalReason: input.reason,
      },
    });

    return { payment: reversedPayment, invoice: { id: invoice.id, status: newStatus, paidAmount: newPaidAmount, balanceDue: newBalanceDue } };
  }).then(async (result) => {
    await logAuditEvent({
      action: 'PAYMENT_REVERSE',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        paymentId: result.payment.id,
        invoiceId: result.invoice.id,
        amount: result.payment.amount.toString(),
        method: result.payment.paymentMethod,
        reason: input.reason,
        previousInvoiceStatus: originalStatus,
        newInvoiceStatus: result.invoice.status,
      },
    });

    return result;
  });
}

/**
 * Refunds an invoice, optionally returns items to stock, reverses accounting journals,
 * and logs an auditable reversal.
 *
 * Steps performed (all inside one Prisma transaction):
 * 1. Guard: duplicate-refund / invalid-status checks
 * 2. Mark invoice REFUNDED
 * 3. Optionally restore inventory (RETURN movements)
 * 4. Reverse the original INVOICE sale journal exactly once (DR Revenue, CR AR)
 * 5. Update customer ledger so the cached balance reflects the refund
 * 6. Emit INVOICE_REFUND audit event
 */
export async function refundInvoice(input: RefundInvoiceInput) {
  if (!input.reason || input.reason.trim() === '') {
    throw new AppError('A refund reason is required', 'VALIDATION_ERROR');
  }

  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice || invoice.businessId !== input.businessId) {
      throw new AppError('Invoice not found in this business', 'NOT_FOUND');
    }

    if (invoice.status === 'REFUNDED') {
      throw new AppError('Invoice has already been refunded', 'VALIDATION_ERROR');
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'DRAFT') {
      throw new AppError(`Cannot refund invoice with status ${invoice.status}`, 'VALIDATION_ERROR');
    }

    // Update status to REFUNDED
    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'REFUNDED',
      },
    });

    // Return stock to inventory if requested
    if (input.returnStockToInventory) {
      for (const item of invoice.items) {
        if (item.productId) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product && product.businessId === input.businessId) {
            const previousStock = product.stockQuantity;
            const resultingStock = previousStock.plus(item.quantity);

            await tx.product.update({
              where: { id: product.id },
              data: {
                stockQuantity: resultingStock,
                updatedById: input.userId,
              },
            });

            await tx.inventoryMovement.create({
              data: {
                businessId: input.businessId,
                productId: product.id,
                movementType: 'RETURN',
                quantity: item.quantity,
                unitCost: item.unitCostSnapshot,
                previousStock,
                resultingStock,
                reason: `Invoice #${invoice.invoiceNumber} refund: ${input.reason}`,
                reference: invoice.invoiceNumber,
                createdById: input.userId,
              },
            });
          }
        }
      }
    }

    // Reverse the original INVOICE sale journal exactly once.
    // This unwinding produces: DR Revenue, CR AR (equal-and-opposite to original).
    // It's safe to call even if the journal is missing (returns null) — a DRAFT that
    // was never issued won't have one — but for ISSUED/PAID invoices it must exist.
    const saleJournalReversal = await reverseSourceJournal(tx, {
      businessId: input.businessId,
      sourceType: 'INVOICE',
      sourceId: invoice.id,
      reversalSourceType: 'INVOICE_REFUND',
      reference: invoice.invoiceNumber,
      description: `Refund of Invoice #${invoice.invoiceNumber}: ${input.reason}`,
      userId: input.userId,
    });

    if (!saleJournalReversal && (invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID')) {
      throw new AppError('Posted sale journal for this invoice was not found — cannot complete refund', 'NOT_FOUND');
    }

    // If customer and invoice had payments, record ledger refund
    if (invoice.customerId && invoice.paidAmount.greaterThan(0)) {
      await recordLedgerEntry(tx, {
        businessId: input.businessId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        entryType: 'REFUND',
        amount: invoice.paidAmount,
        description: `Refund for Invoice #${invoice.invoiceNumber}: ${input.reason}`,
        reference: invoice.invoiceNumber,
        userId: input.userId,
      });
    }

    return updatedInvoice;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'INVOICE_REFUND',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        invoiceId: result.id,
        invoiceNumber: result.invoiceNumber,
        refundReason: input.reason,
      },
    });

    return result;
  });
}
