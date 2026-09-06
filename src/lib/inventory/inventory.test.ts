import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addStock, adjustStock, getInventorySummary, getInventoryMovements } from './service';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { Prisma } from '@prisma/client';

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    inventoryBatch: {
      create: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock Audit
vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Inventory Domain Service & Concurrency Safety', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('addStock (Stock-In Receipt)', () => {
    it('should atomically add stock, recalculate weighted-average cost, and record movement', async () => {
      // Mock existing product: 10 units @ ₹100
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-A',
        name: 'USB Cable',
        SKU: 'USB-001',
        costPrice: new Prisma.Decimal('100.00'),
        stockQuantity: new Prisma.Decimal('10.0000'),
      } as any);

      vi.mocked(prisma.product.update).mockResolvedValue({
        id: 'prod-1',
        stockQuantity: new Prisma.Decimal('30.0000'),
        costPrice: new Prisma.Decimal('120.00'),
      } as any);

      vi.mocked(prisma.inventoryBatch.create).mockResolvedValue({
        id: 'batch-1',
      } as any);

      vi.mocked(prisma.inventoryMovement.create).mockResolvedValue({
        id: 'mov-1',
        movementType: 'STOCK_IN',
        quantity: new Prisma.Decimal('20.0000'),
        previousStock: new Prisma.Decimal('10.0000'),
        resultingStock: new Prisma.Decimal('30.0000'),
        unitCost: new Prisma.Decimal('130.00'),
      } as any);

      // Add 20 units @ ₹130 (Total value: 1000 + 2600 = 3600 / 30 = ₹120)
      const result = await addStock({
        businessId: 'biz-A',
        productId: 'prod-1',
        quantity: 20,
        unitCost: 130,
        batchNumber: 'BATCH-001',
        userId: 'user-1',
      });

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({
            stockQuantity: new Prisma.Decimal('30'),
            costPrice: new Prisma.Decimal('120'),
          }),
        })
      );

      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            movementType: 'STOCK_IN',
            quantity: new Prisma.Decimal('20'),
            previousStock: new Prisma.Decimal('10'),
            resultingStock: new Prisma.Decimal('30'),
          }),
        })
      );

      expect(result.movement.resultingStock.equals(new Prisma.Decimal('30'))).toBe(true);
    });

    it('should reject non-positive quantity or negative unit cost', async () => {
      await expect(
        addStock({
          businessId: 'biz-A',
          productId: 'prod-1',
          quantity: 0,
          unitCost: 100,
          userId: 'user-1',
        })
      ).rejects.toThrow(AppError);

      await expect(
        addStock({
          businessId: 'biz-A',
          productId: 'prod-1',
          quantity: 10,
          unitCost: -5,
          userId: 'user-1',
        })
      ).rejects.toThrow('Unit cost cannot be negative');
    });
  });

  describe('adjustStock (Adjustments, Damage, Returns)', () => {
    it('should correctly deduct stock on DAMAGE and record immutable movement', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-A',
        stockQuantity: new Prisma.Decimal('15.0000'),
        costPrice: new Prisma.Decimal('50.00'),
      } as any);

      vi.mocked(prisma.product.update).mockResolvedValue({
        id: 'prod-1',
        stockQuantity: new Prisma.Decimal('12.0000'),
        costPrice: new Prisma.Decimal('50.00'),
      } as any);

      vi.mocked(prisma.inventoryMovement.create).mockResolvedValue({
        id: 'mov-damage',
        movementType: 'DAMAGE',
        quantity: new Prisma.Decimal('3.0000'),
        previousStock: new Prisma.Decimal('15.0000'),
        resultingStock: new Prisma.Decimal('12.0000'),
      } as any);

      const result = await adjustStock({
        businessId: 'biz-A',
        productId: 'prod-1',
        movementType: 'DAMAGE',
        quantity: 3,
        reason: 'Water damage during transit',
        userId: 'user-1',
      });

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stockQuantity: new Prisma.Decimal('12'),
          }),
        })
      );
      expect(result.movement.resultingStock.equals(new Prisma.Decimal('12'))).toBe(true);
    });

    it('should strictly prevent negative inventory when deducting more than current stock', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-A',
        stockQuantity: new Prisma.Decimal('5.0000'),
        costPrice: new Prisma.Decimal('50.00'),
      } as any);

      // Attempt to deduct 10 units when only 5 exist
      await expect(
        adjustStock({
          businessId: 'biz-A',
          productId: 'prod-1',
          movementType: 'DAMAGE',
          quantity: 10,
          reason: 'Excessive loss',
          userId: 'user-1',
        })
      ).rejects.toThrow('Insufficient inventory: Current stock is 5, cannot reduce by 10');
    });

    it('should require an explicit reason for manual adjustments', async () => {
      await expect(
        adjustStock({
          businessId: 'biz-A',
          productId: 'prod-1',
          movementType: 'ADJUSTMENT',
          quantity: 2,
          reason: '',
          userId: 'user-1',
        })
      ).rejects.toThrow('A valid reason is required for manual stock adjustments');
    });
  });

  describe('Cross-Tenant Security & Isolation Tests', () => {
    it('should reject addStock when product belongs to another tenant (IDOR attack)', async () => {
      // Product belongs to biz-B, but request context is biz-A
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-foreign',
        businessId: 'biz-B', // Foreign business
        stockQuantity: new Prisma.Decimal('10.0000'),
        costPrice: new Prisma.Decimal('100.00'),
      } as any);

      await expect(
        addStock({
          businessId: 'biz-A', // Attacker's tenant context
          productId: 'prod-foreign',
          quantity: 5,
          unitCost: 100,
          userId: 'user-attacker',
        })
      ).rejects.toThrow('Product not found in this business');
    });

    it('should reject adjustStock when product belongs to another tenant', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-foreign',
        businessId: 'biz-B',
        stockQuantity: new Prisma.Decimal('10.0000'),
      } as any);

      await expect(
        adjustStock({
          businessId: 'biz-A',
          productId: 'prod-foreign',
          movementType: 'ADJUSTMENT',
          quantity: -2,
          reason: 'Attempted cross-tenant tamper',
          userId: 'user-attacker',
        })
      ).rejects.toThrow('Product not found in this business');
    });

    it('should reject damage recording for product of another tenant', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-foreign',
        businessId: 'biz-B',
        stockQuantity: new Prisma.Decimal('10.0000'),
      } as any);

      await expect(
        adjustStock({
          businessId: 'biz-A',
          productId: 'prod-foreign',
          movementType: 'DAMAGE',
          quantity: 5,
          reason: 'Cross-tenant damage injection',
          userId: 'user-attacker',
        })
      ).rejects.toThrow('Product not found in this business');
    });

    it('should reject return recording for product of another tenant', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-foreign',
        businessId: 'biz-B',
        stockQuantity: new Prisma.Decimal('10.0000'),
      } as any);

      await expect(
        adjustStock({
          businessId: 'biz-A',
          productId: 'prod-foreign',
          movementType: 'RETURN',
          quantity: 5,
          reason: 'Cross-tenant return injection',
          userId: 'user-attacker',
        })
      ).rejects.toThrow('Product not found in this business');
    });
  });

  describe('Inventory Summaries and Aggregations', () => {
    it('should calculate total products, units, valuation, and low stock threshold counts', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: 'p1',
          stockQuantity: new Prisma.Decimal('10.0000'),
          costPrice: new Prisma.Decimal('50.00'),
          lowStockThreshold: new Prisma.Decimal('5.0000'),
        },
        {
          id: 'p2',
          stockQuantity: new Prisma.Decimal('2.0000'), // Low stock!
          costPrice: new Prisma.Decimal('100.00'),
          lowStockThreshold: new Prisma.Decimal('10.0000'),
        },
      ] as any);

      vi.mocked(prisma.inventoryMovement.findMany).mockResolvedValue([]);

      const summary = await getInventorySummary('biz-A');

      expect(summary.totalProducts).toBe(2);
      expect(summary.totalUnits.equals(new Prisma.Decimal('12'))).toBe(true);
      // Valuation: (10 * 50) + (2 * 100) = 500 + 200 = 700
      expect(summary.totalValuation.equals(new Prisma.Decimal('700'))).toBe(true);
      expect(summary.lowStockCount).toBe(1);
    });

    it('returns a monetary valuation (not a unit count) for the dashboard Inventory Value metric', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: 'prod-1',
          stockQuantity: new Prisma.Decimal('5.0000'),
          costPrice: new Prisma.Decimal('10.00'),
          lowStockThreshold: new Prisma.Decimal('2.0000'),
        },
        {
          id: 'prod-2',
          stockQuantity: new Prisma.Decimal('3.0000'),
          costPrice: new Prisma.Decimal('20.00'),
          lowStockThreshold: new Prisma.Decimal('2.0000'),
        },
      ] as any);
      vi.mocked(prisma.inventoryMovement.findMany).mockResolvedValue([]);

      const summary = await getInventorySummary('biz-A');

      // totalUnits is a raw count (8), totalValuation is monetary (5*10 + 3*20 = 110).
      expect(summary.totalUnits.equals(new Prisma.Decimal('8'))).toBe(true);
      expect(summary.totalValuation.equals(new Prisma.Decimal('110'))).toBe(true);
      // The dashboard must display totalValuation, never totalUnits.
      expect(summary.totalValuation.greaterThan(summary.totalUnits)).toBe(true);
    });

    it('returns zero monetary valuation for an empty business', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      vi.mocked(prisma.inventoryMovement.findMany).mockResolvedValue([]);

      const summary = await getInventorySummary('biz-empty');

      expect(summary.totalProducts).toBe(0);
      expect(summary.totalValuation.equals(new Prisma.Decimal('0'))).toBe(true);
      expect(summary.totalUnits.equals(new Prisma.Decimal('0'))).toBe(true);
    });
  });
});
