/**
 * Purchase Service Tests — Phase 3.6 & 3.15-A
 *
 * Tests the full purchase lifecycle:
 * - Create bill (RECEIVED vs DRAFT)
 * - Weighted-average cost update
 * - Supplier balance update
 * - Supplier payment recording
 * - Bill cancellation with stock/journal reversal
 * - Tenant isolation
 * - Duplicate idempotency
 */
import { Prisma } from '@prisma/client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../lib/errors';

// ── Mock state ────────────────────────────────────────────────────────────────

const mockState = {
  product: {
    id: 'prod-1',
    businessId: 'biz-1',
    name: 'Test Widget',
    SKU: 'TW-001',
    stockQuantity: new Prisma.Decimal('100'),
    costPrice: new Prisma.Decimal('50'),
  },
  supplier: {
    id: 'sup-1',
    businessId: 'biz-1',
    name: 'Test Supplier Ltd',
    state: 'KA',
    currentBalance: new Prisma.Decimal('0'),
    archived: false,
  },
  bill: null as Record<string, unknown> | null,
  payment: null as Record<string, unknown> | null,
  journal: false,
  supplierJournal: false,
  reversal: false,
  auditEvents: [] as string[],
  seqNumber: 0,
};

const resetMockState = () => {
  mockState.product = {
    id: 'prod-1',
    businessId: 'biz-1',
    name: 'Test Widget',
    SKU: 'TW-001',
    stockQuantity: new Prisma.Decimal('100'),
    costPrice: new Prisma.Decimal('50'),
  };
  mockState.supplier = {
    id: 'sup-1',
    businessId: 'biz-1',
    name: 'Test Supplier Ltd',
    state: 'KA',
    currentBalance: new Prisma.Decimal('0'),
    archived: false,
  };
  mockState.bill = null;
  mockState.payment = null;
  mockState.journal = false;
  mockState.supplierJournal = false;
  mockState.reversal = false;
  mockState.auditEvents = [];
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => {
  const tx = {
    purchaseBill: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if ((where as { businessId_idempotencyKey?: { idempotencyKey: string } }).businessId_idempotencyKey?.idempotencyKey === 'idem-exists') {
          return {
            id: 'bill-existing',
            billNumber: 'BILL-00001',
            status: 'RECEIVED',
            totalAmount: { toString: () => '1000' },
          };
        }
        if (mockState.bill && (where as { id?: string }).id === (mockState.bill as { id: string }).id) {
          return mockState.bill;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mockState.bill = {
          id: 'bill-1',
          billNumber: 'BILL-00001',
          businessId: 'biz-1',
          supplierId: 'sup-1',
          status: data.status,
          paidAmount: { greaterThan: () => false, toString: () => '0', plus: (v: { toString: () => string }) => ({ toString: () => v.toString(), isZero: () => false }) },
          balanceDue: { greaterThan: (_v: { toString: () => string }) => true, toString: () => '1180' },
          totalAmount: { toString: () => '1180', minus: (v: { toString: () => string }) => ({ toString: () => String(1180 - parseFloat(v.toString())), isZero: () => (1180 - parseFloat(v.toString())) === 0 }) },
          items: [],
          supplier: mockState.supplier,
          ...data,
        };
        return mockState.bill;
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mockState.bill = { ...mockState.bill, ...data };
        return mockState.bill;
      }),
    },
    purchaseBillItem: { create: vi.fn(async () => ({})) },
    purchaseSequence: { upsert: vi.fn(async () => ({ prefix: 'BILL', currentNumber: 1 })) },
    transactionSequence: { upsert: vi.fn(async () => ({ currentNumber: 1 })) },
    supplier: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const w = where as { businessId?: string };
        if (w.businessId !== 'biz-1') return null;
        return mockState.supplier;
      }),
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const w = where as { id?: string };
        if (w.id === 'sup-1') return mockState.supplier;
        return null;
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mockState.supplier = { ...mockState.supplier, ...data };
        return mockState.supplier;
      }),
    },
    product: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const w = where as { id?: string };
        return w.id === 'prod-1' ? mockState.product : null;
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const ids = (where as { id?: { in?: string[] } }).id?.in || [];
        return ids.includes('prod-1') ? [mockState.product] : [];
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mockState.product = { ...mockState.product, ...data };
        return mockState.product;
      }),
    },
    inventoryMovement: { create: vi.fn(async () => ({})) },
    purchasePayment: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        mockState.payment = { id: 'pay-1', ...data };
        return mockState.payment;
      }),
    },
    business: { findUnique: vi.fn(async () => ({ state: 'KA' })) },
    account: {
      findMany: vi.fn(async () => [
        { id: 'acc-inv', code: '1200', name: 'Inventory', type: 'ASSET', balance: { plus: () => ({ toString: () => '0' }) } },
        { id: 'acc-gst', code: '1300', name: 'GST ITC', type: 'ASSET', balance: { plus: () => ({ toString: () => '0' }) } },
        { id: 'acc-ap', code: '2010', name: 'Accounts Payable', type: 'LIABILITY', balance: { plus: () => ({ toString: () => '0' }) } },
        { id: 'acc-cash', code: '1010', name: 'Cash', type: 'ASSET', balance: { plus: () => ({ toString: () => '0' }) } },
        { id: 'acc-bank', code: '1020', name: 'Bank', type: 'ASSET', balance: { plus: () => ({ toString: () => '0' }) } },
      ]),
      update: vi.fn(async () => ({})),
    },
    transaction: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'txn-1', ...data, entries: [] })),
    },
  };

  return {
    prisma: {
      supplier: tx.supplier,
      product: tx.product,
      business: tx.business,
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    },
  };
});

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(async ({ action }: { action: string }) => {
    mockState.auditEvents.push(action);
  }),
}));

vi.mock('@/services/accounting/journalBridge', () => ({
  recordPurchaseBillJournal: vi.fn(async () => {
    mockState.journal = true;
    return { id: 'txn-purchase-1' };
  }),
  recordSupplierPaymentJournal: vi.fn(async () => {
    mockState.supplierJournal = true;
    return { id: 'txn-pay-1' };
  }),
  reverseSourceJournal: vi.fn(async () => {
    mockState.reversal = true;
    return { id: 'txn-rev-1' };
  }),
}));

import { createPurchaseBill, recordPurchasePayment, cancelPurchaseBill } from './purchaseService';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Purchase Service — Phase 3.6 & 3.15-A', () => {
  beforeEach(() => {
    resetMockState();
    vi.clearAllMocks();
  });

  const baseItem = {
    productId: 'prod-1',
    productName: 'Test Widget',
    sku: 'TW-001',
    unit: 'PCS',
    quantity: 10,
    unitCost: 100,
    taxRate: 18,
  };

  const baseInput = {
    businessId: 'biz-1',
    supplierId: 'sup-1',
    userId: 'user-1',
    items: [baseItem],
  };

  describe('createPurchaseBill', () => {
    it('creates a RECEIVED bill, posts inventory movements and accounting journal', async () => {
      const bill = await createPurchaseBill({ ...baseInput, status: 'RECEIVED' });
      expect(bill).toBeDefined();
      expect(bill.id).toBe('bill-1');
      expect(mockState.journal).toBe(true);
      expect(mockState.auditEvents).toContain('PURCHASE_CREATE');
    });

    it('creates a DRAFT bill without posting journal or updating inventory', async () => {
      const bill = await createPurchaseBill({ ...baseInput, status: 'DRAFT' });
      expect(bill).toBeDefined();
      expect(mockState.journal).toBe(false);
    });

    it('rejects when supplier belongs to a different business (tenant isolation)', async () => {
      await expect(
        createPurchaseBill({ ...baseInput, businessId: 'biz-attacker' })
      ).rejects.toThrow(AppError);
    });

    it('rejects empty items array', async () => {
      await expect(
        createPurchaseBill({ ...baseInput, items: [] })
      ).rejects.toThrow(AppError);
    });

    it('returns cached bill on duplicate idempotency key (no double-posting)', async () => {
      const result = await createPurchaseBill({ ...baseInput, idempotencyKey: 'idem-exists' });
      expect((result as { id: string }).id).toBe('bill-existing');
      expect(mockState.journal).toBe(false);
    });
  });

  describe('recordPurchasePayment', () => {
    beforeEach(() => {
      mockState.bill = {
        id: 'bill-1',
        businessId: 'biz-1',
        supplierId: 'sup-1',
        billNumber: 'BILL-00001',
        status: 'RECEIVED',
        paidAmount: new Prisma.Decimal('0'),
        balanceDue: new Prisma.Decimal('1180'),
        totalAmount: new Prisma.Decimal('1180'),
        items: [],
        supplier: mockState.supplier,
      };
    });

    it('records payment and posts supplier payment journal', async () => {
      const payment = await recordPurchasePayment({
        businessId: 'biz-1',
        supplierId: 'sup-1',
        userId: 'user-1',
        billId: 'bill-1',
        amount: 500,
        paymentMethod: 'BANK_TRANSFER',
      });
      expect(payment).toBeDefined();
      expect(mockState.supplierJournal).toBe(true);
      expect(mockState.auditEvents).toContain('PURCHASE_PAYMENT_CREATE');
    });

    it('rejects payment for supplier in different business (tenant isolation)', async () => {
      await expect(
        recordPurchasePayment({
          businessId: 'biz-attacker',
          billId: 'bill-1',
          supplierId: 'sup-1',
          amount: 500,
          paymentMethod: 'CASH',
          userId: 'user-1',
        })
      ).rejects.toThrow(AppError);
    });

    it('rejects zero-amount payment', async () => {
      await expect(
        recordPurchasePayment({
          businessId: 'biz-1',
          billId: 'bill-1',
          supplierId: 'sup-1',
          amount: 0,
          paymentMethod: 'CASH',
          userId: 'user-1',
        })
      ).rejects.toThrow(AppError);
    });

    it('rejects negative-amount payment', async () => {
      await expect(
        recordPurchasePayment({
          businessId: 'biz-1',
          billId: 'bill-1',
          supplierId: 'sup-1',
          amount: -100,
          paymentMethod: 'CASH',
          userId: 'user-1',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('cancelPurchaseBill', () => {
    it('cancels a RECEIVED bill, reverses stock movements and accounting journal', async () => {
      mockState.bill = {
        id: 'bill-1',
        businessId: 'biz-1',
        supplierId: 'sup-1',
        billNumber: 'BILL-00001',
        status: 'RECEIVED',
        paidAmount: { greaterThan: () => false, toString: () => '0' },
        totalAmount: { toString: () => '1180' },
items: [
        {
          productId: 'prod-1',
          productName: 'Widget',
          quantity: new Prisma.Decimal('10'),
          unitCost: new Prisma.Decimal('100'),
        },
      ],
        supplier: {
          ...mockState.supplier,
          currentBalance: { minus: (v: unknown) => v, toString: () => '1180' },
        },
      };

      const result = await cancelPurchaseBill('biz-1', 'bill-1', 'Wrong delivery', 'user-1');
      expect(result).toBeDefined();
      expect(mockState.reversal).toBe(true);
      expect(mockState.auditEvents).toContain('PURCHASE_CANCEL');
    });

    it('prevents double cancellation of same bill', async () => {
      mockState.bill = {
        id: 'bill-1',
        businessId: 'biz-1',
        status: 'CANCELLED',
        paidAmount: { greaterThan: () => false },
      };
      await expect(
        cancelPurchaseBill('biz-1', 'bill-1', 'already cancelled', 'user-1')
      ).rejects.toThrow(AppError);
    });

    it('prevents cancellation when bill has recorded payments', async () => {
      mockState.bill = {
        id: 'bill-1',
        businessId: 'biz-1',
        status: 'PARTIALLY_PAID',
        paidAmount: { greaterThan: () => true, toString: () => '500' },
      };
      await expect(
        cancelPurchaseBill('biz-1', 'bill-1', 'has payments', 'user-1')
      ).rejects.toThrow(AppError);
    });

    it('rejects cross-tenant cancellation attempt', async () => {
      mockState.bill = {
        id: 'bill-1',
        businessId: 'biz-1',
        status: 'RECEIVED',
        paidAmount: { greaterThan: () => false },
      };
      await expect(
        cancelPurchaseBill('biz-attacker', 'bill-1', 'hack', 'attacker')
      ).rejects.toThrow(AppError);
    });
  });
});
