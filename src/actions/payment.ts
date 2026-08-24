'use server';

import { requirePermission } from '@/lib/auth';
import { recordInvoicePayment } from '@/lib/invoices/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'] as const),
  reference: z.string().nullish(),
  notes: z.string().nullish(),
  idempotencyKey: z.string().nullish(),
});

export type RecordPaymentFormData = z.input<typeof paymentSchema>;

/**
 * Server action to record payments against issued invoices.
 */
export async function recordPaymentAction(businessId: string, formData: RecordPaymentFormData) {
  const context = await requirePermission(businessId, 'INVOICE_PAY');
  const parsed = paymentSchema.parse(formData);

  const result = await recordInvoicePayment({
    businessId,
    invoiceId: parsed.invoiceId,
    amount: parsed.amount,
    paymentMethod: parsed.paymentMethod as PaymentMethod,
    reference: parsed.reference || null,
    notes: parsed.notes || null,
    idempotencyKey: parsed.idempotencyKey || null,
    userId: context.userId,
  });

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${parsed.invoiceId}`);
  revalidatePath('/payments');
  revalidatePath('/customers');
  revalidatePath('/dashboard');

  return result;
}
