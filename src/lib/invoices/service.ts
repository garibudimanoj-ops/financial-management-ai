import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';
import { toDecimal, DecimalLike } from '@/lib/inventory/valuation';
import { calculateInvoiceTotals, calculateBalanceDue } from './calculations';
import { recordLedgerEntry } from '@/lib/customers/service';
import { recordSaleInvoiceJournal, recordPaymentJournal } from '@/services/accounting/journalBridge';
import { InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client';

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
  initialPayment?: {
    amount: DecimalLike;
    paymentMethod: PaymentMethod;
    reference?: string | null;
    notes?: string | null;
  } | null;
  userId: string;
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

    // 2. Validate customer if supplied
    if (input.customerId) {
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer || customer.businessId !== input.businessId) {
        throw new AppError('Customer not found in this business', 'NOT_FOUND');
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

    // 5. If issued/paid, verify stock and deduct inventory atomically
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

        // Update product stock
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: resultingStock,
            updatedById: input.userId,
          },
        });

        // Record immutable SALE inventory movement
        await tx.inventoryMovement.create({
          data: {
            businessId: input.businessId,
            productId: product.id,
            movementType: 'SALE',
            quantity: requestedQty,
            unitCost: product.costPrice,
            previousStock,
            resultingStock,
            reason: 'POS / Sales invoice issue',
            createdById: input.userId,
          },
        });
      }
    }

    // 6. Generate collision-free invoice number
    const invoiceNumber = await generateNextInvoiceNumber(tx, input.businessId);

    // Initial payment resolution
    let initialPaid = new Prisma.Decimal(0);
    if (input.initialPayment && toDecimal(input.initialPayment.amount).greaterThan(0)) {
      initialPaid = toDecimal(input.initialPayment.amount);
    }

    const totalAmount = calculatedTotals.totalAmount;
    const balanceDue = calculateBalanceDue(totalAmount, initialPaid);

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

    // 10. Record initial payment if submitted with checkout
    if (input.initialPayment && initialPaid.greaterThan(0)) {
      const payment = await tx.payment.create({
        data: {
          businessId: input.businessId,
          invoiceId: invoice.id,
          customerId: input.customerId || null,
          amount: initialPaid,
          paymentMethod: input.initialPayment.paymentMethod,
          reference: input.initialPayment.reference || null,
          notes: input.initialPayment.notes || 'POS checkout payment',
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
          amount: initialPaid,
          description: `Payment received for Invoice #${invoiceNumber}`,
          reference: payment.reference || invoiceNumber,
          userId: input.userId,
        });
      }
    }

    // 11. General Ledger integration: Post double-entry journal
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
        initialPaid,
        paymentMethod: input.initialPayment?.paymentMethod,
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

/**
 * Refunds an invoice, optionally returns items to stock, and logs auditable reversal.
 */
export async function refundInvoice(input: RefundInvoiceInput) {
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
