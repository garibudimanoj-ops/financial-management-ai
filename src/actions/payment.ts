'use server';

import { requirePermission } from '@/lib/auth';
import { recordInvoicePayment, reversePayment } from '@/lib/invoices/service';
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

const reversePaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment is required'),
  reason: z.string().min(1, 'Reversal reason is required'),
});

export type ReversePaymentFormData = z.input<typeof reversePaymentSchema>;

/**
 * Server action to reverse a previously recorded invoice payment.
 *
 * Reverses the customer ledger, the General Ledger payment journal, the invoice
 * paidAmount/status, and marks the original payment as reversed. Paid/partially
 * paid invoices remain cancellable only after their payments have been reversed.
 */
export async function reversePaymentAction(businessId: string, formData: ReversePaymentFormData) {
  const context = await requirePermission(businessId, 'INVOICES_MANAGE');
  const parsed = reversePaymentSchema.parse(formData);

  const result = await reversePayment({
    businessId,
    paymentId: parsed.paymentId,
    reason: parsed.reason,
    userId: context.userId,
  });

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${result.invoice.id}`);
  revalidatePath('/payments');
  revalidatePath('/customers');
  revalidatePath('/dashboard');

  return result;
}
