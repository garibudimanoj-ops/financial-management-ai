import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransaction, getTransactionById, listTransactions } from './transactionService';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { Prisma } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    transactionSequence: {
      upsert: vi.fn().mockResolvedValue({ currentNumber: 1 }),
    },
    account: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('Accounting Transaction Service - Double Entry Engine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.transactionSequence.upsert).mockResolvedValue({ currentNumber: 1 } as any);
  });

  describe('createTransaction', () => {
    it('should successfully create a balanced double-entry transaction and update account balances', async () => {
      const mockAccounts = [
        {
          id: 'acc-cash',
          businessId: 'biz-1',
          code: '1010',
          name: 'Cash on Hand',
          type: 'ASSET',
          balance: new Prisma.Decimal('1000.00'),
        },
        {
          id: 'acc-sales',
          businessId: 'biz-1',
          code: '4010',
          name: 'Sales Revenue',
          type: 'REVENUE',
          balance: new Prisma.Decimal('5000.00'),
        },
      ];

      vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts as any);
      vi.mocked(prisma.transaction.count).mockResolvedValue(5);
      vi.mocked(prisma.account.update).mockResolvedValue({} as any);

      vi.mocked(prisma.transaction.create).mockResolvedValue({
        id: 'txn-123',
        businessId: 'biz-1',
        transactionNumber: 'TXN-20260901-0006',
        date: new Date('2026-09-01'),
        description: 'Retail Cash Sale',
        reference: 'INV-1001',
        status: 'POSTED',
        requiresHumanReview: false,
        verifiedStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
        entries: [
          {
            id: 'e1',
            transactionId: 'txn-123',
            accountId: 'acc-cash',
            debit: new Prisma.Decimal('2000.00'),
            credit: new Prisma.Decimal('0.00'),
            description: 'Cash received',
            account: mockAccounts[0],
          },
          {
            id: 'e2',
            transactionId: 'txn-123',
            accountId: 'acc-sales',
            debit: new Prisma.Decimal('0.00'),
            credit: new Prisma.Decimal('2000.00'),
            description: 'Revenue earned',
            account: mockAccounts[1],
          },
        ],
      } as any);

      const result = await createTransaction({
        businessId: 'biz-1',
        description: 'Retail Cash Sale',
        reference: 'INV-1001',
        entries: [
          { accountId: 'acc-cash', debit: '2000.00', credit: '0.00' },
          { accountId: 'acc-sales', debit: '0.00', credit: '2000.00' },
        ],
      });

      expect(result.id).toBe('txn-123');
      expect(result.totalAmount).toBe('2000');
      expect(result.entries).toHaveLength(2);
      expect(prisma.account.update).toHaveBeenCalledTimes(2);
    });

    it('should reject unbalanced transactions with HTTP 400 and clear error message', async () => {
      await expect(
        createTransaction({
          businessId: 'biz-1',
          description: 'Unbalanced Transaction',
          entries: [
            { accountId: 'acc-cash', debit: '2000.00', credit: '0.00' },
            { accountId: 'acc-sales', debit: '0.00', credit: '1500.00' },
          ],
        })
      ).rejects.toThrow('Debits and credits must balance');
    });

    it('should reject transaction with less than two entries', async () => {
      await expect(
        createTransaction({
          businessId: 'biz-1',
          description: 'Single Entry',
          entries: [{ accountId: 'acc-cash', debit: '1000.00', credit: '0.00' }],
        })
      ).rejects.toThrow('Transaction must contain at least two entries');
    });

    it('should reject transaction when accounts do not exist or belong to another business', async () => {
      vi.mocked(prisma.account.findMany).mockResolvedValue([
        { id: 'acc-cash', businessId: 'biz-1', type: 'ASSET', balance: new Prisma.Decimal(0) },
      ] as any);

      await expect(
        createTransaction({
          businessId: 'biz-1',
          description: 'Missing Account',
          entries: [
            { accountId: 'acc-cash', debit: '1000.00', credit: '0.00' },
            { accountId: 'acc-nonexistent', debit: '0.00', credit: '1000.00' },
          ],
        })
      ).rejects.toThrow('One or more specified accounts do not exist or belong to another organization');
    });

    it('should reject transaction with negative entry amounts', async () => {
      await expect(
        createTransaction({
          businessId: 'biz-1',
          description: 'Negative amount',
          entries: [
            { accountId: 'acc-1', debit: '-500', credit: '0' },
            { accountId: 'acc-2', debit: '0', credit: '-500' },
          ],
        })
      ).rejects.toThrow('Entry amounts cannot be negative');
    });
  });

  describe('getTransactionById & listTransactions', () => {
    it('should retrieve transaction details by ID', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue({
        id: 'txn-1',
        businessId: 'biz-1',
        transactionNumber: 'TXN-001',
        date: new Date(),
        description: 'Test Txn',
        status: 'POSTED',
        requiresHumanReview: false,
        verifiedStatus: 'VERIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
        entries: [
          { id: 'e1', debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0) },
          { id: 'e2', debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100) },
        ],
      } as any);

      const txn = await getTransactionById('biz-1', 'txn-1');
      expect(txn.id).toBe('txn-1');
      expect(txn.totalAmount).toBe('100');
    });

    it('should throw 404 if transaction does not exist', async () => {
      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);

      await expect(getTransactionById('biz-1', 'nonexistent')).rejects.toThrow(AppError);
    });
  });
});
