import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProduct, updateProduct, archiveProduct, unarchiveProduct } from './product';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { Prisma } from '@prisma/client';

// Mock Auth
vi.mock('@/lib/auth', () => ({
  requirePermission: vi.fn().mockResolvedValue({
    userId: 'user-owner',
    userEmail: 'owner@example.com',
    businessId: 'biz-1',
    role: 'OWNER',
  }),
}));

// Mock Audit
vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock Next Cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
    },
  },
}));

import { requirePermission } from '@/lib/auth';

describe('Product Actions & RBAC CRUD', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requirePermission).mockResolvedValue({
      userId: 'user-owner',
      userEmail: 'owner@example.com',
      businessId: 'biz-1',
      role: 'OWNER',
      membershipStatus: 'ACTIVE',
      supabaseUserId: 'supa-1',
    });
  });

  describe('createProduct', () => {
    it('should create product with valid data and scoped SKU uniqueness', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.product.create).mockResolvedValue({
        id: 'prod-new',
        businessId: 'biz-1',
        name: 'Gaming Headset',
        SKU: 'GAM-HDS-01',
        costPrice: new Prisma.Decimal('500.00'),
        sellingPrice: new Prisma.Decimal('999.00'),
        stockQuantity: new Prisma.Decimal(0),
      } as any);

      const product = await createProduct('biz-1', {
        name: 'Gaming Headset',
        SKU: 'GAM-HDS-01',
        costPrice: 500,
        sellingPrice: 999,
        unit: 'PCS',
        taxCategory: 'GST_18',
        lowStockThreshold: 5,
        initialStock: 0,
      });

      expect(product.id).toBe('prod-new');
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: 'biz-1',
            name: 'Gaming Headset',
            SKU: 'GAM-HDS-01',
          }),
        })
      );
    });

    it('should reject duplicate SKU within the same business with CONFLICT', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: 'prod-existing',
        businessId: 'biz-1',
        SKU: 'GAM-HDS-01',
      } as any);

      await expect(
        createProduct('biz-1', {
          name: 'Another Headset',
          SKU: 'GAM-HDS-01',
          costPrice: 400,
          sellingPrice: 800,
          unit: 'PCS',
          taxCategory: 'GST_18',
          lowStockThreshold: 5,
          initialStock: 0,
        })
      ).rejects.toThrow("A product with SKU 'GAM-HDS-01' already exists in this business");
    });

    it('should reject duplicate Barcode within the same business with CONFLICT', async () => {
      // First findUnique for SKU passes (null)
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null);
      // Second findUnique for barcode finds conflict
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: 'prod-existing',
        businessId: 'biz-1',
        barcode: '8901234567890',
      } as any);

      await expect(
        createProduct('biz-1', {
          name: 'Barcode Duplicate Product',
          SKU: 'UNIQUE-SKU',
          barcode: '8901234567890',
          costPrice: 100,
          sellingPrice: 200,
          unit: 'PCS',
          taxCategory: 'GST_18',
          lowStockThreshold: 5,
          initialStock: 0,
        })
      ).rejects.toThrow("A product with barcode '8901234567890' already exists in this business");
    });
  });

  describe('updateProduct', () => {
    it('should update product fields while preserving accounting integrity', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-1',
        name: 'Old Name',
        SKU: 'SKU-001',
        barcode: null,
      } as any);

      vi.mocked(prisma.product.update).mockResolvedValue({
        id: 'prod-1',
        name: 'New Name',
        SKU: 'SKU-001',
      } as any);

      const result = await updateProduct('biz-1', 'prod-1', {
        name: 'New Name',
        SKU: 'SKU-001',
        sellingPrice: 1200,
        unit: 'PCS',
        taxCategory: 'GST_18',
        lowStockThreshold: 10,
      });

      expect(result.name).toBe('New Name');
      expect(prisma.product.update).toHaveBeenCalled();
    });

    it('should prevent cross-tenant product update', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-foreign',
        businessId: 'biz-2', // Foreign business
      } as any);

      await expect(
        updateProduct('biz-1', 'prod-foreign', {
          name: 'Hacked Name',
          SKU: 'SKU-HACK',
          sellingPrice: 50,
          unit: 'PCS',
          taxCategory: 'GST_18',
          lowStockThreshold: 10,
        })
      ).rejects.toThrow('Product not found in this business');
    });
  });

  describe('archiveProduct & unarchiveProduct', () => {
    it('should soft-archive a product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-1',
        name: 'Discontinued Item',
      } as any);

      vi.mocked(prisma.product.update).mockResolvedValue({
        id: 'prod-1',
        archived: true,
      } as any);

      const result = await archiveProduct('biz-1', 'prod-1');
      expect(result.archived).toBe(true);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ archived: true }),
        })
      );
    });

    it('should unarchive a product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        businessId: 'biz-1',
        name: 'Reactivated Item',
      } as any);

      vi.mocked(prisma.product.update).mockResolvedValue({
        id: 'prod-1',
        archived: false,
      } as any);

      const result = await unarchiveProduct('biz-1', 'prod-1');
      expect(result.archived).toBe(false);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ archived: false }),
        })
      );
    });
  });
});
