'use server';

import { requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { finalizeSale, refundInvoice, cancelInvoice } from '@/lib/invoices/service';
import { recordLedgerEntry } from '@/lib/customers/service';
import { recordSaleInvoiceJournal } from '@/services/accounting/journalBridge';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PaymentMethod, Prisma } from '@prisma/client';

const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
  discount: z.coerce.number().min(0).optional().default(0),
  taxRate: z.coerce.number().min(0).optional(),
  taxCategory: z.string().nullish(),
});

const finalizeSaleSchema = z.object({
  customerId: z.string().nullish(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  invoiceDiscount: z.coerce.number().min(0).optional().default(0),
  dueDate: z.string().nullish().transform((v) => (v && v.trim() !== '' ? new Date(v) : undefined)),
  notes: z.string().nullish(),
  idempotencyKey: z.string().nullish(),
  status: z.enum(['DRAFT', 'ISSUED', 'PAID']).optional().default('ISSUED'),
  initialPayment: z
    .object({
      amount: z.coerce.number().min(0),
      paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'] as const),
      reference: z.string().nullish(),
      notes: z.string().nullish(),
    })
    .nullish(),
  initialPayments: z
    .array(
      z.object({
        amount: z.coerce.number().min(0),
        paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'] as const),
        reference: z.string().nullish(),
        notes: z.string().nullish(),
      })
    )
    .nullish(),
});

export type FinalizeSaleFormData = z.input<typeof finalizeSaleSchema>;

/**
 * Finalizes a POS checkout or sales invoice issue with atomic stock deduction and ledger recording.
 */
export async function finalizeSaleAction(businessId: string, formData: FinalizeSaleFormData) {
  const context = await requirePermission(businessId, 'SALE_CREATE');
  const parsed = finalizeSaleSchema.parse(formData);

  const result = await finalizeSale({
    businessId,
    customerId: parsed.customerId || null,
    items: parsed.items,
    invoiceDiscount: parsed.invoiceDiscount,
    dueDate: parsed.dueDate,
    notes: parsed.notes,
    idempotencyKey: parsed.idempotencyKey,
    status: parsed.status,
    initialPayment: parsed.initialPayment
      ? {
          amount: parsed.initialPayment.amount,
          paymentMethod: parsed.initialPayment.paymentMethod as PaymentMethod,
          reference: parsed.initialPayment.reference,
          notes: parsed.initialPayment.notes,
        }
      : null,
    initialPayments: parsed.initialPayments
      ? parsed.initialPayments.map((p) => ({
          amount: p.amount,
          paymentMethod: p.paymentMethod as PaymentMethod,
          reference: p.reference,
          notes: p.notes,
        }))
      : null,
    userId: context.userId,
  });

  revalidatePath('/pos');
  revalidatePath('/invoices');
  revalidatePath('/products');
  revalidatePath('/inventory');
  revalidatePath('/customers');
  revalidatePath('/dashboard');

  return result;
}

/**
 * Issues a previously saved DRAFT invoice, deducting inventory and recognizing customer receivable.
 */
export async function issueInvoiceAction(businessId: string, invoiceId: string) {
  const context = await requirePermission(businessId, 'INVOICE_ISSUE');

  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice || invoice.businessId !== businessId) {
      throw new AppError('Invoice not found in this business', 'NOT_FOUND');
    }

    if (invoice.status !== 'DRAFT') {
      throw new AppError(`Cannot issue an invoice with status ${invoice.status}`, 'VALIDATION_ERROR');
    }

    // Verify stock and deduct inventory
    let totalCostOfGoods = new Prisma.Decimal(0);
    for (const item of invoice.items) {
      if (!item.productId) continue;

      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || product.businessId !== businessId) {
        throw new AppError(`Product '${item.productNameSnapshot}' not found`, 'NOT_FOUND');
      }

      if (product.stockQuantity.lessThan(item.quantity)) {
        throw new AppError(
          `Insufficient stock for '${product.name}': Available ${product.stockQuantity.toString()}, requested ${item.quantity.toString()}`,
          'VALIDATION_ERROR'
        );
      }

      totalCostOfGoods = totalCostOfGoods.plus(product.costPrice.mul(item.quantity));
      const previousStock = product.stockQuantity;
      const resultingStock = previousStock.minus(item.quantity);

      await tx.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: resultingStock,
          updatedById: context.userId,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId,
          productId: product.id,
          movementType: 'SALE',
          quantity: item.quantity,
          unitCost: product.costPrice,
          previousStock,
          resultingStock,
          reason: `Invoice issued #${invoice.invoiceNumber}`,
          reference: invoice.invoiceNumber,
          createdById: context.userId,
        },
      });
    }

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'ISSUED',
      },
    });

    if (invoice.customerId) {
      await recordLedgerEntry(tx, {
        businessId,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        entryType: 'INVOICE',
        amount: invoice.totalAmount,
        description: `Invoice issued #${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        userId: context.userId,
      });
    }

    // General Ledger integration: Post double-entry journal
    await recordSaleInvoiceJournal(tx, {
      businessId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      totalCostOfGoods,
      initialPaid: invoice.paidAmount,
      userId: context.userId,
    });

    return updatedInvoice;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'INVOICE_ISSUE',
      businessId,
      userId: context.userId,
      details: {
        invoiceId: result.id,
        invoiceNumber: result.invoiceNumber,
      },
    });

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/products');
    revalidatePath('/inventory');
    revalidatePath('/dashboard');

    return result;
  });
}

const refundSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  returnStockToInventory: z.boolean().default(true),
  reason: z.string().min(1, 'Refund reason is required'),
});

export type RefundInvoiceFormData = z.input<typeof refundSchema>;

/**
 * Refunds an invoice and optionally returns items to stock.
 */
export async function refundInvoiceAction(businessId: string, formData: RefundInvoiceFormData) {
  const context = await requirePermission(businessId, 'INVOICE_REFUND');
  const parsed = refundSchema.parse(formData);

  const result = await refundInvoice({
    businessId,
    invoiceId: parsed.invoiceId,
    returnStockToInventory: parsed.returnStockToInventory,
    reason: parsed.reason,
    userId: context.userId,
  });

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${parsed.invoiceId}`);
  revalidatePath('/products');
  revalidatePath('/inventory');
  revalidatePath('/customers');
  revalidatePath('/dashboard');

  return result;
}

const cancelInvoiceSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  reason: z.string().min(1, 'Cancellation reason is required'),
});

export type CancelInvoiceFormData = z.input<typeof cancelInvoiceSchema>;

/**
 * Cancels an invoice. Drafts are voided immediately; unpaid issued invoices have
 * stock restored and their sale journal reversed. Paid/partially paid invoices
 * must have their payments reversed or refunded before they can be cancelled.
 */
export async function cancelInvoiceAction(businessId: string, formData: CancelInvoiceFormData) {
  const context = await requirePermission(businessId, 'INVOICES_MANAGE');
  const parsed = cancelInvoiceSchema.parse(formData);

  const result = await cancelInvoice({
    businessId,
    invoiceId: parsed.invoiceId,
    reason: parsed.reason,
    userId: context.userId,
  });

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${parsed.invoiceId}`);
  revalidatePath('/products');
  revalidatePath('/inventory');
  revalidatePath('/customers');
  revalidatePath('/dashboard');

  return result;
}
