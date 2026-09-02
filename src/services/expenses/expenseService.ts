import { prisma } from '@/lib/prisma';
import { Prisma, PaymentMethod } from '@prisma/client';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';
import { toDecimal, DecimalLike } from '@/lib/inventory/valuation';
import { recordExpenseJournal } from '@/services/accounting/journalBridge';

export interface CreateExpenseInput {
  businessId: string;
  categoryId?: string | null;
  accountId: string;
  supplierId?: string | null;
  payeeName: string;
  amount: DecimalLike;
  taxRate?: DecimalLike;
  paymentMethod?: PaymentMethod;
  expenseDate?: Date | null;
  reference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  userId: string;
}

/**
 * Generates an incrementing, collision-free expense voucher number scoped to tenant.
 */
export async function generateNextExpenseNumber(
  tx: Prisma.TransactionClient,
  businessId: string,
  prefix = 'EXP'
): Promise<string> {
  const sequence = await tx.expenseSequence.upsert({
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
 * Creates and posts an operating expense voucher with double-entry General Ledger recording.
 */
export async function createExpense(input: CreateExpenseInput) {
  const baseAmount = toDecimal(input.amount);
  if (baseAmount.lessThanOrEqualTo(0)) {
    throw new AppError('Expense amount must be greater than zero', 'VALIDATION_ERROR');
  }

  if (!input.payeeName || input.payeeName.trim() === '') {
    throw new AppError('Payee name or vendor is required', 'VALIDATION_ERROR');
  }

  const [account, category, supplier] = await Promise.all([
    prisma.account.findFirst({ where: { id: input.accountId, businessId: input.businessId } }),
    input.categoryId ? prisma.expenseCategory.findFirst({ where: { id: input.categoryId, businessId: input.businessId } }) : null,
    input.supplierId ? prisma.supplier.findFirst({ where: { id: input.supplierId, businessId: input.businessId, archived: false } }) : null,
  ]);

  if (!account) {
    throw new AppError('Expense account not found in this business', 'NOT_FOUND');
  }
  if (account.type !== 'EXPENSE') throw new AppError('Selected account must be an expense account', 'VALIDATION_ERROR');
  if (input.categoryId && !category) throw new AppError('Expense category not found in this business', 'NOT_FOUND');
  if (input.supplierId && !supplier) throw new AppError('Supplier not found in this business', 'NOT_FOUND');

  const taxR = input.taxRate ? toDecimal(input.taxRate) : new Prisma.Decimal(0);
  const taxAmount = baseAmount.mul(taxR).div(100);
  const totalAmount = baseAmount.plus(taxAmount);
  const paymentMethod = input.paymentMethod || 'BANK_TRANSFER';
  const expenseDate = input.expenseDate || new Date();

  return await prisma.$transaction(async (tx) => {
    const expenseNumber = await generateNextExpenseNumber(tx, input.businessId);

    const expense = await tx.expense.create({
      data: {
        businessId: input.businessId,
        expenseNumber,
        categoryId: input.categoryId || null,
        accountId: input.accountId,
        supplierId: input.supplierId || null,
        payeeName: input.payeeName.trim(),
        amount: baseAmount,
        taxRate: taxR,
        taxAmount,
        totalAmount,
        paymentMethod,
        paymentStatus: 'PAID',
        expenseDate,
        reference: input.reference?.trim() || null,
        receiptUrl: input.receiptUrl?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: input.userId,
      },
    });

    // Post double-entry General Ledger transaction
    await recordExpenseJournal(tx, {
      businessId: input.businessId,
      expenseId: expense.id,
      expenseNumber,
      accountId: account.id,
      payeeName: input.payeeName.trim(),
      amount: baseAmount,
      taxAmount,
      totalAmount,
      paymentMethod,
      userId: input.userId,
      date: expenseDate,
    });

    return expense;
  }).then(async (result) => {
    await logAuditEvent({
      action: 'EXPENSE_CREATE',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        expenseId: result.id,
        expenseNumber: result.expenseNumber,
        totalAmount: result.totalAmount.toString(),
        accountId: result.accountId,
      },
    });

    return result;
  });
}

/**
 * Lists expenses for an active business with optional category or date filters.
 */
export async function listExpenses(businessId: string, search?: string) {
  const where: Prisma.ExpenseWhereInput = {
    businessId,
    ...(search && search.trim() !== ''
      ? {
          OR: [
            { expenseNumber: { contains: search.trim(), mode: 'insensitive' } },
            { payeeName: { contains: search.trim(), mode: 'insensitive' } },
            { reference: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return await prisma.expense.findMany({
    where,
    include: {
      account: true,
      category: true,
      supplier: true,
    },
    orderBy: { expenseDate: 'desc' },
  });
}

/**
 * Gets expense summary grouped by accounts for financial analysis.
 */
export async function getExpenseSummary(businessId: string) {
  const expenses = await prisma.expense.findMany({
    where: { businessId },
    include: {
      account: true,
    },
  });

  const map = new Map<string, { accountCode: string; accountName: string; total: Prisma.Decimal; count: number }>();

  let grandTotal = new Prisma.Decimal(0);

  for (const exp of expenses) {
    grandTotal = grandTotal.plus(exp.totalAmount);
    const existing = map.get(exp.accountId) || {
      accountCode: exp.account.code,
      accountName: exp.account.name,
      total: new Prisma.Decimal(0),
      count: 0,
    };

    existing.total = existing.total.plus(exp.totalAmount);
    existing.count += 1;
    map.set(exp.accountId, existing);
  }

  return {
    grandTotal,
    breakdown: Array.from(map.values()),
  };
}
