'use server';

import { requirePermission } from '@/lib/auth';
import {
  createPurchaseBill,
  receiveAndPostPurchaseBill,
  recordPurchasePayment,
  cancelPurchaseBill,
} from '@/services/purchases/purchaseService';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PaymentMethod, PurchaseBillStatus } from '@prisma/client';

const purchaseItemSchema = z.object({
  productId: z.string().nullish(),
  productName: z.string().min(1, 'Product or item description is required'),
  sku: z.string().nullish(),
  unit: z.string().nullish().default('PCS'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be non-negative'),
  discount: z.coerce.number().min(0).optional().default(0),
  taxRate: z.coerce.number().min(0).optional().default(0),
});

const createPurchaseBillSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  supplierInvoiceNumber: z.string().nullish(),
  billDate: z.string().nullish().transform((v) => (v && v.trim() !== '' ? new Date(v) : null)),
  dueDate: z.string().nullish().transform((v) => (v && v.trim() !== '' ? new Date(v) : null)),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
  notes: z.string().nullish(),
  status: z.enum(['DRAFT', 'RECEIVED']).optional().default('RECEIVED'),
  idempotencyKey: z.string().nullish(),
});

export type CreatePurchaseBillFormData = z.input<typeof createPurchaseBillSchema>;

export async function createPurchaseBillAction(businessId: string, formData: CreatePurchaseBillFormData) {
  const context = await requirePermission(businessId, 'PURCHASE_CREATE');
  const parsed = createPurchaseBillSchema.parse(formData);

  const bill = await createPurchaseBill({
    businessId,
    supplierId: parsed.supplierId,
    supplierInvoiceNumber: parsed.supplierInvoiceNumber,
    billDate: parsed.billDate,
    dueDate: parsed.dueDate,
    items: parsed.items,
    notes: parsed.notes,
    status: parsed.status as PurchaseBillStatus,
    idempotencyKey: parsed.idempotencyKey,
    userId: context.userId,
  });

  revalidatePath('/purchases');
  revalidatePath('/inventory');
  revalidatePath('/products');
  revalidatePath('/suppliers');
  revalidatePath('/reports');
  revalidatePath('/dashboard');

  return bill;
}

export async function receiveAndPostPurchaseBillAction(businessId: string, billId: string) {
  const context = await requirePermission(businessId, 'PURCHASE_POST');
  const bill = await receiveAndPostPurchaseBill(businessId, billId, context.userId);

  revalidatePath('/purchases');
  revalidatePath(`/purchases/${billId}`);
  revalidatePath('/inventory');
  revalidatePath('/products');
  revalidatePath('/reports');
  revalidatePath('/dashboard');

  return bill;
}

const recordPaymentSchema = z.object({
  billId: z.string().nullish(),
  supplierId: z.string().min(1, 'Supplier is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'] as const),
  paymentDate: z.string().nullish().transform((v) => (v && v.trim() !== '' ? new Date(v) : null)),
  reference: z.string().nullish(),
  notes: z.string().nullish(),
  idempotencyKey: z.string().nullish(),
});

export type RecordPurchasePaymentFormData = z.input<typeof recordPaymentSchema>;

export async function recordPurchasePaymentAction(businessId: string, formData: RecordPurchasePaymentFormData) {
  const context = await requirePermission(businessId, 'PURCHASE_PAY');
  const parsed = recordPaymentSchema.parse(formData);

  const payment = await recordPurchasePayment({
    businessId,
    billId: parsed.billId || null,
    supplierId: parsed.supplierId,
    amount: parsed.amount,
    paymentMethod: parsed.paymentMethod as PaymentMethod,
    paymentDate: parsed.paymentDate,
    reference: parsed.reference,
    notes: parsed.notes,
    idempotencyKey: parsed.idempotencyKey,
    userId: context.userId,
  });

  revalidatePath('/purchases');
  if (parsed.billId) {
    revalidatePath(`/purchases/${parsed.billId}`);
  }
  revalidatePath('/suppliers');
  revalidatePath('/reports');
  revalidatePath('/dashboard');

  return payment;
}

export async function cancelPurchaseBillAction(businessId: string, billId: string, reason: string) {
  const context = await requirePermission(businessId, 'PURCHASE_CANCEL');
  const bill = await cancelPurchaseBill(businessId, billId, reason, context.userId);

  revalidatePath('/purchases');
  revalidatePath(`/purchases/${billId}`);
  revalidatePath('/inventory');
  revalidatePath('/products');
  revalidatePath('/suppliers');
  revalidatePath('/reports');
  revalidatePath('/dashboard');

  return bill;
}

/** Form-compatible adapters keep authorization and parsing on the server. */
export async function receiveAndPostPurchaseBillFormAction(businessId: string, billId: string, _formData: FormData): Promise<void> {
  await receiveAndPostPurchaseBillAction(businessId, billId);
}

export async function cancelPurchaseBillFormAction(businessId: string, billId: string, reason: string, _formData: FormData): Promise<void> {
  await cancelPurchaseBillAction(businessId, billId, reason);
}

export async function recordPurchasePaymentFormAction(businessId: string, billId: string, supplierId: string, formData: FormData): Promise<void> {
  await recordPurchasePaymentAction(businessId, {
    billId,
    supplierId,
    amount: String(formData.get('amount') || ''),
    paymentMethod: String(formData.get('paymentMethod') || 'BANK_TRANSFER') as PaymentMethod,
    paymentDate: String(formData.get('paymentDate') || '') || null,
    reference: String(formData.get('reference') || '') || null,
    notes: String(formData.get('notes') || '') || null,
    idempotencyKey: `payment-${billId}-${crypto.randomUUID()}`,
  });
}
