'use server';

import { requirePermission } from '@/lib/auth';
import { createExpense } from '@/services/expenses/expenseService';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

const expenseSchema = z.object({
  accountId: z.string().min(1, 'Expense account is required'),
  categoryId: z.string().nullish(),
  supplierId: z.string().nullish(),
  payeeName: z.string().min(1, 'Payee or vendor name is required'),
  amount: z.coerce.number().positive('Expense amount must be greater than zero'),
  taxRate: z.coerce.number().min(0).optional().default(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'] as const).default('BANK_TRANSFER'),
  expenseDate: z.string().nullish().transform((v) => (v && v.trim() !== '' ? new Date(v) : null)),
  reference: z.string().nullish(),
  receiptUrl: z.string().nullish(),
  notes: z.string().nullish(),
});

export type ExpenseFormData = z.input<typeof expenseSchema>;

export async function createExpenseAction(businessId: string, formData: ExpenseFormData) {
  const context = await requirePermission(businessId, 'EXPENSE_CREATE');
  const parsed = expenseSchema.parse(formData);

  const expense = await createExpense({
    businessId,
    accountId: parsed.accountId,
    categoryId: parsed.categoryId || null,
    supplierId: parsed.supplierId || null,
    payeeName: parsed.payeeName,
    amount: parsed.amount,
    taxRate: parsed.taxRate,
    paymentMethod: parsed.paymentMethod as PaymentMethod,
    expenseDate: parsed.expenseDate,
    reference: parsed.reference,
    receiptUrl: parsed.receiptUrl,
    notes: parsed.notes,
    userId: context.userId,
  });

  revalidatePath('/expenses');
  revalidatePath('/reports');
  revalidatePath('/reports/profit-loss');
  revalidatePath('/dashboard');

  return expense;
}
