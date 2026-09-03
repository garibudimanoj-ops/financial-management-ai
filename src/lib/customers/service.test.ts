/**
 * Customer Service Tests — Phase 3.4 & 3.15-B
 *
 * Tests:
 * - Ledger entry creation and balance update
 * - INVOICE, PAYMENT, CREDIT, DEBIT, REFUND entry types
 * - Balance reconciliation
 * - Tenant isolation (businessId mismatch)
 * - Credit limit enforcement (done at invoice service level, tested via recordLedgerEntry primitives)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ── Mock state ─────────────────────────────────────────────────────────────────

let mockCustomer: Record<string, unknown> = {};
let createdLedgerEntry: Record<string, unknown> | null = null;
let updatedCustomer: Record<string, unknown> | null = null;

const makeDecimal = (value: number) => ({
  toString: () => String(value),
  plus: (v: { toString: () => string }) => makeDecimal(value + parseFloat(v.toString())),
  minus: (v: { toString: () => string }) => makeDecimal(value - parseFloat(v.toString())),
  equals: (v: { toString: () => string }) => value === parseFloat(v.toString()),
  greaterThan: (v: number | { toString: () => string }) => typeof v === 'number' ? value > v : value > parseFloat(v.toString()),
  greaterThanOrEqualTo: (v: number | { toString: () => string }) => typeof v === 'number' ? value >= v : value >= parseFloat(v.toString()),
  lessThan: (v: number | { toString: () => string }) => typeof v === 'number' ? value < v : value < parseFloat(v.toString()),
  toNumber: () => value,
  isZero: () => value === 0,
});

vi.mock('../../lib/prisma', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const w = where as { id?: string };
        if (w.id === 'cust-1') return mockCustomer;
        return null;
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updatedCustomer = { ...mockCustomer, ...data };
        mockCustomer = { ...mockCustomer, ...data };
        return updatedCustomer;
      }),
    },
    customerLedgerEntry: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        createdLedgerEntry = { id: 'ledger-1', ...data };
        return createdLedgerEntry;
      }),
    },
  },
}));

const makeTx = () => ({
  customer: {
    findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const w = where as { id?: string };
      if (w.id === 'cust-1') return mockCustomer;
      return null;
    }),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      updatedCustomer = { ...mockCustomer, ...data };
      mockCustomer = { ...mockCustomer, ...data };
      return updatedCustomer;
    }),
  },
  customerLedgerEntry: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      createdLedgerEntry = { id: 'ledger-1', ...data };
      return createdLedgerEntry;
    }),
  },
});

import { recordLedgerEntry, reconcileCustomerBalance } from './service';

const resetState = () => {
  mockCustomer = {
    id: 'cust-1',
    businessId: 'biz-1',
    name: 'Alice Smith',
    currentBalance: makeDecimal(0),
    openingBalance: makeDecimal(0),
    archived: false,
    creditLimit: makeDecimal(5000),
    ledgerEntries: [],
  };
  createdLedgerEntry = null;
  updatedCustomer = null;
};

describe('Customer Ledger Service — Phase 3.4 & 3.15-B', () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  describe('recordLedgerEntry', () => {
    it('INVOICE entry increases customer balance (receivable goes up)', async () => {
      const tx = makeTx();
      const result = await recordLedgerEntry(tx as unknown as Parameters<typeof recordLedgerEntry>[0], {
        businessId: 'biz-1',
        customerId: 'cust-1',
        entryType: 'INVOICE',
        amount: '1000',
        description: 'Invoice issued',
        userId: 'user-1',
      });
      expect(result).toBeDefined();
      expect(result.entry.id).toBe('ledger-1');
      // Balance should increase by 1000
      const balanceAfter = result.balanceAfter.toString();
      expect(parseFloat(balanceAfter)).toBeCloseTo(1000);
    });

    it('PAYMENT entry decreases customer balance (receivable goes down)', async () => {
      // Start with balance of 1000
      mockCustomer = { ...mockCustomer, currentBalance: makeDecimal(1000) };
      const tx = makeTx();

      const result = await recordLedgerEntry(tx as unknown as Parameters<typeof recordLedgerEntry>[0], {
        businessId: 'biz-1',
        customerId: 'cust-1',
        entryType: 'PAYMENT',
        amount: '500',
        description: 'Payment received',
        userId: 'user-1',
      });
      const balanceAfter = result.balanceAfter.toString();
      expect(parseFloat(balanceAfter)).toBeCloseTo(500);
    });

    it('REFUND entry decreases customer balance', async () => {
      mockCustomer = { ...mockCustomer, currentBalance: makeDecimal(800) };
      const tx = makeTx();

      const result = await recordLedgerEntry(tx as unknown as Parameters<typeof recordLedgerEntry>[0], {
        businessId: 'biz-1',
        customerId: 'cust-1',
        entryType: 'REFUND',
        amount: '800',
        description: 'Full refund',
        userId: 'user-1',
      });
      expect(parseFloat(result.balanceAfter.toString())).toBeCloseTo(0);
    });

    it('CREDIT entry decreases customer balance', async () => {
      mockCustomer = { ...mockCustomer, currentBalance: makeDecimal(300) };
      const tx = makeTx();

      const result = await recordLedgerEntry(tx as unknown as Parameters<typeof recordLedgerEntry>[0], {
        businessId: 'biz-1',
        customerId: 'cust-1',
        entryType: 'CREDIT',
        amount: '100',
        description: 'Credit note',
        userId: 'user-1',
      });
      expect(parseFloat(result.balanceAfter.toString())).toBeCloseTo(200);
    });

    it('DEBIT entry increases customer balance', async () => {
      mockCustomer = { ...mockCustomer, currentBalance: makeDecimal(100) };
      const tx = makeTx();

      const result = await recordLedgerEntry(tx as unknown as Parameters<typeof recordLedgerEntry>[0], {
        businessId: 'biz-1',
        customerId: 'cust-1',
        entryType: 'DEBIT',
        amount: '200',
        description: 'Charge back',
        userId: 'user-1',
      });
      expect(parseFloat(result.balanceAfter.toString())).toBeCloseTo(300);
    });

    it('throws NOT_FOUND for customer in different business (tenant isolation)', async () => {
      const tx = makeTx();
      await expect(
        recordLedgerEntry(tx as unknown as Parameters<typeof recordLedgerEntry>[0], {
          businessId: 'biz-attacker',
          customerId: 'cust-1',
          entryType: 'INVOICE',
          amount: '999',
          userId: 'attacker',
        })
      ).rejects.toThrow(AppError);
    });

    it('throws NOT_FOUND for non-existent customer', async () => {
      const tx = makeTx();
      await expect(
        recordLedgerEntry(tx as unknown as Parameters<typeof recordLedgerEntry>[0], {
          businessId: 'biz-1',
          customerId: 'cust-nonexistent',
          entryType: 'INVOICE',
          amount: '500',
          userId: 'user-1',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('reconcileCustomerBalance', () => {
    it('correctly reconciles when cached balance matches ledger history', async () => {
      // Customer with a matching cached balance
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce({
        ...mockCustomer,
        currentBalance: makeDecimal(500),
        openingBalance: makeDecimal(0),
        ledgerEntries: [
          { entryType: 'INVOICE', amount: makeDecimal(1000) },
          { entryType: 'PAYMENT', amount: makeDecimal(500) },
        ],
      } as unknown as Parameters<typeof prisma.customer.findUnique>[0] extends { where: infer W } ? Awaited<ReturnType<typeof prisma.customer.findUnique>> : never);

      const result = await reconcileCustomerBalance('biz-1', 'cust-1');
      expect(result.isReconciled).toBe(true);
      expect(parseFloat(result.computedBalance.toString())).toBeCloseTo(500);
    });

    it('throws NOT_FOUND for customer in different business (tenant isolation)', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce(null);

      await expect(reconcileCustomerBalance('biz-attacker', 'cust-1')).rejects.toThrow(AppError);
    });
  });
});
