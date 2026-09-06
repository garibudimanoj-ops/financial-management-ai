import { prisma } from '@/lib/prisma';
import { Prisma, PurchaseBillStatus, PaymentMethod } from '@prisma/client';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';
import { toDecimal, DecimalLike, calculateWeightedAverageCost } from '@/lib/inventory/valuation';
import { recordPurchaseBillJournal, recordSupplierPaymentJournal, reverseSourceJournal } from '@/services/accounting/journalBridge';
import { calculateIndianGst, calculatePurchaseTotals } from './calculations';

export interface PurchaseBillItemInput {
  productId?: string | null;
  productName: string;
  sku?: string | null;
  unit?: string | null;
  quantity: DecimalLike;
  unitCost: DecimalLike;
  discount?: DecimalLike;
  taxRate?: DecimalLike;
}

export interface CreatePurchaseBillInput {
  businessId: string;
  supplierId: string;
  supplierInvoiceNumber?: string | null;
  billDate?: Date | null;
  dueDate?: Date | null;
  items: PurchaseBillItemInput[];
  notes?: string | null;
  status?: PurchaseBillStatus;
  idempotencyKey?: string | null;
  userId: string;
}

export interface RecordPurchasePaymentInput {
  businessId: string;
  billId?: string | null;
  supplierId: string;
  amount: DecimalLike;
  paymentMethod: PaymentMethod;
  paymentDate?: Date | null;
  reference?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  userId: string;
}

/**
 * Generates an incrementing, collision-free purchase bill number scoped to tenant.
 */
export async function generateNextBillNumber(
  tx: Prisma.TransactionClient,
  businessId: string,
  prefix = 'BILL'
): Promise<string> {
  const sequence = await tx.purchaseSequence.upsert({
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
 * Creates and optionally receives/posts a purchase bill.
 */
export async function createPurchaseBill(input: CreatePurchaseBillInput) {
  if (!input.items || input.items.length === 0) {
    throw new AppError('Purchase bill must contain at least one item', 'VALIDATION_ERROR');
  }

  const [supplier, business] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: input.supplierId, businessId: input.businessId, archived: false } }),
    prisma.business.findUnique({ where: { id: input.businessId }, select: { state: true } }),
  ]);

  if (!supplier) {
    throw new AppError('Supplier not found in this business', 'NOT_FOUND');
  }

  const productIds = input.items.flatMap((item) => item.productId ? [item.productId] : []);
  if (new Set(productIds).size !== productIds.length) throw new AppError('A product can appear only once on a purchase bill', 'VALIDATION_ERROR');
  if (productIds.length > 0) {
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId: input.businessId }, select: { id: true } });
    if (products.length !== productIds.length) throw new AppError('One or more products do not belong to this business', 'FORBIDDEN');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Idempotency check
    if (input.idempotencyKey) {
      const existing = await tx.purchaseBill.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId: input.businessId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) return existing;
    }

    const billNumber = await generateNextBillNumber(tx, input.businessId);
    const billDate = input.billDate || new Date();
    const isReceived = input.status !== 'DRAFT';

    const totals = calculatePurchaseTotals(input.items);
    const { subtotal, discountAmount, taxAmount, totalAmount } = totals;
    const gst = calculateIndianGst(taxAmount, business?.state, supplier.state);

    interface ComputedItem {
      productId?: string | null;
      productName: string;
      skuSnapshot?: string | null;
      unitSnapshot: string;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal;
      discount: Prisma.Decimal;
      taxRate: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      lineSubtotal: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }

    const computedItems: ComputedItem[] = [];

    for (let index = 0; index < input.items.length; index += 1) {
      const item = input.items[index];
      const calculated = totals.items[index];
      computedItems.push({
        productId: item.productId || null,
        productName: item.productName,
        skuSnapshot: item.sku || null,
        unitSnapshot: item.unit || 'PCS',
        ...calculated,
      });
    }

    // 2. Create PurchaseBill
    const bill = await tx.purchaseBill.create({
      data: {
        businessId: input.businessId,
        supplierId: input.supplierId,
        billNumber,
        supplierInvoiceNumber: input.supplierInvoiceNumber?.trim() || null,
        status: isReceived ? 'RECEIVED' : 'DRAFT',
        billDate,
        dueDate: input.dueDate || null,
        subtotal,
        discountAmount,
        taxAmount,
        cgstAmount: gst.cgstAmount,
        sgstAmount: gst.sgstAmount,
        igstAmount: gst.igstAmount,
        totalAmount,
        paidAmount: new Prisma.Decimal(0),
        balanceDue: totalAmount,
        notes: input.notes?.trim() || null,
        idempotencyKey: input.idempotencyKey || null,
        createdById: input.userId,
      },
    });

    // 3. Create Items & update inventory if received
    for (const cItem of computedItems) {
      await tx.purchaseBillItem.create({
        data: {
          billId: bill.id,
          productId: cItem.productId || null,
          productNameSnapshot: cItem.productName,
          skuSnapshot: cItem.skuSnapshot || null,
          unitSnapshot: cItem.unitSnapshot,
          quantity: cItem.quantity,
          unitCost: cItem.unitCost,
          discount: cItem.discount,
          taxRate: cItem.taxRate,
          taxAmount: cItem.taxAmount,
          lineSubtotal: cItem.lineSubtotal,
          lineTotal: cItem.lineTotal,
        },
      });

      if (isReceived && cItem.productId) {
        const product = await tx.product.findUnique({
          where: { id: cItem.productId },
        });

        if (!product || product.businessId !== input.businessId) throw new AppError('Purchase product not found in this business', 'NOT_FOUND');
        {
          const currentStock = product.stockQuantity;
          const currentCost = product.costPrice;
          const newStock = currentStock.plus(cItem.quantity);

          // Weighted average cost update
          const newAvgCost = calculateWeightedAverageCost(
            currentStock,
            currentCost,
            cItem.quantity,
            cItem.unitCost
          );

          await tx.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: newStock,
              costPrice: newAvgCost,
              updatedById: input.userId,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              businessId: input.businessId,
              productId: product.id,
              movementType: 'STOCK_IN',
              quantity: cItem.quantity,
              unitCost: cItem.unitCost,
              previousStock: currentStock,
              resultingStock: newStock,
              reason: `Purchase Bill #${billNumber} (${supplier.name})`,
              reference: billNumber,
              createdById: input.userId,
            },
          });
        }
      }
    }

    // 4. Update supplier payable balance & post accounting journal if received
    if (isReceived) {
      await tx.supplier.update({
        where: { id: supplier.id },
        data: {
          currentBalance: supplier.currentBalance.plus(totalAmount),
        },
      });

      await recordPurchaseBillJournal(tx, {
        businessId: input.businessId,
        billId: bill.id,
        billNumber,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        supplierName: supplier.name,
        userId: input.userId,
        date: billDate,
      });
    }

    return bill;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'PURCHASE_CREATE',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        billId: result.id,
        billNumber: result.billNumber,
        totalAmount: result.totalAmount.toString(),
        status: result.status,
      },
    });

    return result;
  });
}

/**
 * Transitions a DRAFT purchase bill to RECEIVED, updating inventory, supplier balance, and General Ledger.
 */
export async function receiveAndPostPurchaseBill(businessId: string, billId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const bill = await tx.purchaseBill.findUnique({
      where: { id: billId },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!bill || bill.businessId !== businessId) {
      throw new AppError('Purchase bill not found in this business', 'NOT_FOUND');
    }

    if (bill.status !== 'DRAFT') {
      throw new AppError(`Cannot post bill with status ${bill.status}`, 'VALIDATION_ERROR');
    }

    // 1. Update inventory
    for (const item of bill.items) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (product && product.businessId === businessId) {
        const currentStock = product.stockQuantity;
        const currentCost = product.costPrice;
        const newStock = currentStock.plus(item.quantity);

        const newAvgCost = calculateWeightedAverageCost(
          currentStock,
          currentCost,
          item.quantity,
          item.unitCost
        );

        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: newStock,
            costPrice: newAvgCost,
            updatedById: userId,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            businessId,
            productId: product.id,
            movementType: 'STOCK_IN',
            quantity: item.quantity,
            unitCost: item.unitCost,
            previousStock: currentStock,
            resultingStock: newStock,
            reason: `Purchase Bill #${bill.billNumber} posted`,
            reference: bill.billNumber,
            createdById: userId,
          },
        });
      }
    }

    // 2. Update supplier balance
    await tx.supplier.update({
      where: { id: bill.supplierId },
      data: {
        currentBalance: bill.supplier.currentBalance.plus(bill.totalAmount),
      },
    });

    // 3. Update Bill status
    const updated = await tx.purchaseBill.update({
      where: { id: billId },
      data: {
        status: 'RECEIVED',
      },
    });

    // 4. Post double-entry journal
    await recordPurchaseBillJournal(tx, {
      businessId,
      billId: bill.id,
      billNumber: bill.billNumber,
      subtotal: bill.subtotal,
      discountAmount: bill.discountAmount,
      taxAmount: bill.taxAmount,
      totalAmount: bill.totalAmount,
      supplierName: bill.supplier.name,
      userId,
      date: bill.billDate,
    });

    return updated;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'PURCHASE_POST',
      businessId,
      userId,
      details: { billId: result.id, billNumber: result.billNumber },
    });

    return result;
  });
}

/**
 * Records a settlement payment to a supplier against an outstanding purchase bill.
 */
export async function recordPurchasePayment(input: RecordPurchasePaymentInput) {
  const payAmount = toDecimal(input.amount);
  if (payAmount.lessThanOrEqualTo(0)) {
    throw new AppError('Payment amount must be greater than zero', 'VALIDATION_ERROR');
  }

  return await prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.purchasePayment.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId: input.businessId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) return existing;
    }

    const supplier = await tx.supplier.findUnique({
      where: { id: input.supplierId },
    });

    if (!supplier || supplier.businessId !== input.businessId || supplier.archived) {
      throw new AppError('Supplier not found in this business', 'NOT_FOUND');
    }

    let bill = null;
    if (input.billId) {
      bill = await tx.purchaseBill.findUnique({
        where: { id: input.billId },
      });

      if (!bill || bill.businessId !== input.businessId) {
        throw new AppError('Purchase bill not found in this business', 'NOT_FOUND');
      }
      if (bill.supplierId !== supplier.id) throw new AppError('Purchase bill does not belong to this supplier', 'FORBIDDEN');

      if (bill.status === 'CANCELLED') {
        throw new AppError('Cannot record payment for a cancelled bill', 'VALIDATION_ERROR');
      }

      if (payAmount.greaterThan(bill.balanceDue)) {
        throw new AppError(
          `Payment amount (${payAmount.toString()}) exceeds balance due (${bill.balanceDue.toString()})`,
          'VALIDATION_ERROR'
        );
      }

      const newPaid = bill.paidAmount.plus(payAmount);
      const newBal = bill.totalAmount.minus(newPaid);
      const newStatus: PurchaseBillStatus = newBal.isZero() ? 'PAID' : 'PARTIALLY_PAID';

      await tx.purchaseBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaid,
          balanceDue: newBal,
          status: newStatus,
        },
      });
    }

    // 1. Create PurchasePayment
    const payment = await tx.purchasePayment.create({
      data: {
        businessId: input.businessId,
        supplierId: input.supplierId,
        billId: input.billId || null,
        amount: payAmount,
        paymentMethod: input.paymentMethod,
        paymentDate: input.paymentDate || new Date(),
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        idempotencyKey: input.idempotencyKey || null,
        createdById: input.userId,
      },
    });

    if (!input.billId) throw new AppError('Supplier advances are not supported; select an outstanding purchase bill', 'VALIDATION_ERROR');
    // 2. Reduce supplier outstanding balance
    await tx.supplier.update({
      where: { id: supplier.id },
      data: {
        currentBalance: supplier.currentBalance.minus(payAmount),
      },
    });

    // 3. Post double-entry journal (Debit AP, Credit Cash/Bank)
    await recordSupplierPaymentJournal(tx, {
      businessId: input.businessId,
      paymentId: payment.id,
      billNumber: bill?.billNumber,
      supplierName: supplier.name,
      amount: payAmount,
      paymentMethod: input.paymentMethod,
      userId: input.userId,
      date: input.paymentDate || new Date(),
    });

    return payment;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'PURCHASE_PAYMENT_CREATE',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        paymentId: result.id,
        supplierId: result.supplierId,
        amount: result.amount.toString(),
      },
    });

    return result;
  });
}

/**
 * Cancels an unpaid purchase bill and reverses inventory movement if received.
 */
export async function cancelPurchaseBill(businessId: string, billId: string, reason: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const bill = await tx.purchaseBill.findUnique({
      where: { id: billId },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!bill || bill.businessId !== businessId) {
      throw new AppError('Purchase bill not found in this business', 'NOT_FOUND');
    }

    if (bill.status === 'CANCELLED') {
      throw new AppError('Purchase bill is already cancelled', 'VALIDATION_ERROR');
    }

    if (bill.paidAmount.greaterThan(0)) {
      throw new AppError('Cannot cancel a purchase bill that has recorded payments. Refund/reverse payments first.', 'VALIDATION_ERROR');
    }

    // If was RECEIVED, reverse stock and supplier balance
    if (bill.status === 'RECEIVED') {
      for (const item of bill.items) {
        if (!item.productId) continue;

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product && product.businessId === businessId) {
          const currentStock = product.stockQuantity;
          const newStock = currentStock.minus(item.quantity);

          await tx.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: newStock,
              updatedById: userId,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              businessId,
              productId: product.id,
              movementType: 'RETURN',
              quantity: item.quantity,
              unitCost: item.unitCost,
              previousStock: currentStock,
              resultingStock: newStock,
              reason: `Cancelled Purchase Bill #${bill.billNumber}: ${reason}`,
              reference: bill.billNumber,
              createdById: userId,
            },
          });
        }
      }

      await tx.supplier.update({
        where: { id: bill.supplierId },
        data: {
          currentBalance: bill.supplier.currentBalance.minus(bill.totalAmount),
        },
      });
      await reverseSourceJournal(tx, {
        businessId,
        sourceType: 'PURCHASE_BILL',
        sourceId: bill.id,
        reversalSourceType: 'PURCHASE_CANCELLATION',
        reference: bill.billNumber,
        description: `Cancellation of Purchase Bill #${bill.billNumber}: ${reason}`,
        userId,
      });
    }

    const updated = await tx.purchaseBill.update({
      where: { id: billId },
      data: {
        status: 'CANCELLED',
      },
    });

    return updated;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'PURCHASE_CANCEL',
      businessId,
      userId,
      details: { billId: result.id, billNumber: result.billNumber, reason },
    });

    return result;
  });
}
