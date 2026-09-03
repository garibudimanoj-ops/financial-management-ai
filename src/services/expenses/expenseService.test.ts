import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';

const mocks = vi.hoisted(() => ({
  recordExpenseJournal: vi.fn(),
  logAuditEvent: vi.fn(),
  accountFindFirst: vi.fn(),
  expenseCreate: vi.fn(),
  expenseSequenceUpsert: vi.fn(),
  expenseCategoryFindFirst: vi.fn(),
  supplierFindFirst: vi.fn(),
}));

vi.mock('@/services/accounting/journalBridge', () => ({
  recordExpenseJournal: mocks.recordExpenseJournal,
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(tx),
    account: { findFirst: mocks.accountFindFirst },
    expenseCategory: { findFirst: mocks.expenseCategoryFindFirst },
    supplier: { findFirst: mocks.supplierFindFirst },
  },
}));

const tx = {
  expenseSequence: { upsert: mocks.expenseSequenceUpsert },
  expense: { create: mocks.expenseCreate },
  account: { findFirst: mocks.accountFindFirst },
  expenseCategory: { findFirst: mocks.expenseCategoryFindFirst },
  supplier: { findFirst: mocks.supplierFindFirst },
};

import { createExpense } from './expenseService';

const expenseAccount = {
  id: 'acc-5020',
  code: '5020',
  name: 'Office Rent & Utilities',
  type: 'EXPENSE',
  balance: new Prisma.Decimal(0),
};

describe('Expense Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordExpenseJournal.mockResolvedValue({ id: 'txn-123' });
    mocks.logAuditEvent.mockResolvedValue(undefined);
    mocks.expenseSequenceUpsert.mockResolvedValue({ prefix: 'EXP', currentNumber: 1 });
    mocks.expenseCreate.mockImplementation(async (args: any) => ({ id: 'exp-1', ...args.data }));
    mocks.expenseCategoryFindFirst.mockResolvedValue({ id: 'cat-1', name: 'Rent' });
    mocks.supplierFindFirst.mockResolvedValue(null);
    mocks.accountFindFirst.mockResolvedValue(expenseAccount);
  });

  it('throws VALIDATION_ERROR for non-positive amounts', async () => {
    await expect(
      createExpense({ businessId: 'biz-1', accountId: 'acc-5020', payeeName: 'Landlord', amount: 0, userId: 'user-1' })
    ).rejects.toThrow(AppError);
    expect(mocks.expenseCreate).not.toHaveBeenCalled();
  });

  it('throws VALIDATION_ERROR when payee name is empty', async () => {
    await expect(
      createExpense({ businessId: 'biz-1', accountId: 'acc-5020', payeeName: '   ', amount: 100, userId: 'user-1' })
    ).rejects.toThrow(AppError);
  });

  it('rejects an expense account that does not belong to the business', async () => {
    mocks.accountFindFirst.mockResolvedValueOnce(null);

    await expect(
      createExpense({ businessId: 'biz-1', accountId: 'acc-other-tenant', payeeName: 'Landlord', amount: 100, userId: 'user-1' })
    ).rejects.toThrow('Expense account not found in this business');
    expect(mocks.expenseCreate).not.toHaveBeenCalled();
  });

  it('rejects an account that is not an EXPENSE type', async () => {
    mocks.accountFindFirst.mockResolvedValueOnce({
      id: 'acc-1020',
      code: '1020',
      name: 'Bank Current Account',
      type: 'ASSET',
      balance: new Prisma.Decimal(0),
    });

    await expect(
      createExpense({ businessId: 'biz-1', accountId: 'acc-1020', payeeName: 'Landlord', amount: 100, userId: 'user-1' })
    ).rejects.toThrow('Selected account must be an expense account');
  });

  it('rejects a category that does not belong to the business', async () => {
    mocks.expenseCategoryFindFirst.mockResolvedValueOnce(null);

    await expect(
      createExpense({ businessId: 'biz-1', accountId: 'acc-5020', categoryId: 'cat-other', payeeName: 'Landlord', amount: 100, userId: 'user-1' })
    ).rejects.toThrow('Expense category not found in this business');
  });

  it('posts a balanced double-entry journal for a valid expense', async () => {
    const expense = await createExpense({
      businessId: 'biz-1',
      accountId: 'acc-5020',
      payeeName: 'Landlord',
      amount: 1000,
      taxRate: 18,
      paymentMethod: 'BANK_TRANSFER',
      userId: 'user-1',
    });

    expect(expense.expenseNumber).toBe('EXP-00001');
    expect(Number(expense.totalAmount)).toBe(1180);
    expect(mocks.recordExpenseJournal).toHaveBeenCalledTimes(1);

    const journalInput = mocks.recordExpenseJournal.mock.calls[0][1];
    expect(journalInput.businessId).toBe('biz-1');
    expect(journalInput.expenseId).toBe('exp-1');
    expect(journalInput.accountId).toBe('acc-5020');
    expect(Number(journalInput.amount)).toBe(1000);
    expect(Number(journalInput.taxAmount)).toBe(180);
    expect(Number(journalInput.totalAmount)).toBe(1180);
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EXPENSE_CREATE', businessId: 'biz-1', userId: 'user-1' })
    );
  });
});