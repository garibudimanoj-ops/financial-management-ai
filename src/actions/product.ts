'use server';

import { requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { addStock } from '@/lib/inventory/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { serializeProduct } from '@/lib/serialize';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().nullish(),
  SKU: z.string().min(1, 'SKU is required').transform((v) => v.toUpperCase().trim()),
  barcode: z.string().nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  category: z.string().nullish(),
  unit: z.string().default('PCS'),
  costPrice: z.coerce.number().min(0, 'Cost price must be non-negative'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be non-negative'),
  lowStockThreshold: z.coerce.number().min(0, 'Threshold must be non-negative').default(10),
  taxCategory: z.string().default('STANDARD'),
  initialStock: z.coerce.number().min(0).optional().default(0),
});

export type CreateProductFormData = z.input<typeof productSchema>;

/**
 * Creates a new product for the active business.
 */
export async function createProduct(businessId: string, formData: CreateProductFormData) {
  const context = await requirePermission(businessId, 'PRODUCT_CREATE');
  const parsed = productSchema.parse(formData);

  // Check SKU uniqueness within tenant
  const existingSKU = await prisma.product.findUnique({
    where: {
      businessId_SKU: {
        businessId,
        SKU: parsed.SKU,
      },
    },
  });

  if (existingSKU) {
    throw new AppError(`A product with SKU '${parsed.SKU}' already exists in this business`, 'CONFLICT');
  }

  // Check Barcode uniqueness if barcode provided
  if (parsed.barcode) {
    const existingBarcode = await prisma.product.findUnique({
      where: {
        businessId_barcode: {
          businessId,
          barcode: parsed.barcode,
        },
      },
    });

    if (existingBarcode) {
      throw new AppError(`A product with barcode '${parsed.barcode}' already exists in this business`, 'CONFLICT');
    }
  }

  const product = await prisma.$transaction(async (tx) => {
    const newProduct = await tx.product.create({
      data: {
        businessId,
        name: parsed.name,
        description: parsed.description || null,
        SKU: parsed.SKU,
        barcode: parsed.barcode || null,
        category: parsed.category || null,
        unit: parsed.unit,
        costPrice: new Prisma.Decimal(parsed.costPrice),
        sellingPrice: new Prisma.Decimal(parsed.sellingPrice),
        stockQuantity: new Prisma.Decimal(0),
        lowStockThreshold: new Prisma.Decimal(parsed.lowStockThreshold),
        taxCategory: parsed.taxCategory,
        createdById: context.userId,
        updatedById: context.userId,
      },
    });

    return newProduct;
  });

  await logAuditEvent({
    action: 'PRODUCT_CREATE',
    businessId,
    userId: context.userId,
    details: {
      productId: product.id,
      name: product.name,
      SKU: product.SKU,
    },
  });

  // If initial stock is specified, record initial stock-in atomically
  if (parsed.initialStock && parsed.initialStock > 0) {
    await addStock({
      businessId,
      productId: product.id,
      quantity: parsed.initialStock,
      unitCost: parsed.costPrice,
      reason: 'Initial inventory stock',
      userId: context.userId,
    });
  }

  revalidatePath('/products');
  revalidatePath('/inventory');
  revalidatePath('/dashboard');

  return product;
}

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().nullish(),
  SKU: z.string().min(1, 'SKU is required').transform((v) => v.toUpperCase().trim()),
  barcode: z.string().nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  category: z.string().nullish(),
  unit: z.string().default('PCS'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be non-negative'),
  lowStockThreshold: z.coerce.number().min(0, 'Threshold must be non-negative').default(10),
  taxCategory: z.string().default('STANDARD'),
});

export type UpdateProductFormData = z.input<typeof updateProductSchema>;

/**
 * Updates an existing product. Note that costPrice and stockQuantity are managed
 * exclusively via authoritative inventory movements to preserve accounting integrity.
 */
export async function updateProduct(businessId: string, productId: string, formData: UpdateProductFormData) {
  const context = await requirePermission(businessId, 'PRODUCT_UPDATE');
  const parsed = updateProductSchema.parse(formData);

  const existing = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existing || existing.businessId !== businessId) {
    throw new AppError('Product not found in this business', 'NOT_FOUND');
  }

  // Check SKU uniqueness if changed
  if (parsed.SKU !== existing.SKU) {
    const skuConflict = await prisma.product.findUnique({
      where: {
        businessId_SKU: {
          businessId,
          SKU: parsed.SKU,
        },
      },
    });
    if (skuConflict) {
      throw new AppError(`A product with SKU '${parsed.SKU}' already exists in this business`, 'CONFLICT');
    }
  }

  // Check barcode uniqueness if changed
  if (parsed.barcode && parsed.barcode !== existing.barcode) {
    const barcodeConflict = await prisma.product.findUnique({
      where: {
        businessId_barcode: {
          businessId,
          barcode: parsed.barcode,
        },
      },
    });
    if (barcodeConflict) {
      throw new AppError(`A product with barcode '${parsed.barcode}' already exists in this business`, 'CONFLICT');
    }
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      SKU: parsed.SKU,
      barcode: parsed.barcode || null,
      category: parsed.category || null,
      unit: parsed.unit,
      sellingPrice: new Prisma.Decimal(parsed.sellingPrice),
      lowStockThreshold: new Prisma.Decimal(parsed.lowStockThreshold),
      taxCategory: parsed.taxCategory,
      updatedById: context.userId,
    },
  });

  await logAuditEvent({
    action: 'PRODUCT_UPDATE',
    businessId,
    userId: context.userId,
    details: {
      productId: updated.id,
      name: updated.name,
      SKU: updated.SKU,
    },
  });

  revalidatePath('/products');
  revalidatePath(`/products/${productId}`);
  revalidatePath('/inventory');

  return updated;
}

/**
 * Soft archives a product. Historical movements and reporting remain intact.
 */
export async function archiveProduct(businessId: string, productId: string) {
  const context = await requirePermission(businessId, 'PRODUCT_ARCHIVE');

  const existing = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existing || existing.businessId !== businessId) {
    throw new AppError('Product not found in this business', 'NOT_FOUND');
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      archived: true,
      updatedById: context.userId,
    },
  });

  await logAuditEvent({
    action: 'PRODUCT_ARCHIVE',
    businessId,
    userId: context.userId,
    details: { productId, name: updated.name },
  });

  revalidatePath('/products');
  revalidatePath(`/products/${productId}`);
  revalidatePath('/inventory');

  return updated;
}

/**
 * Unarchives a previously archived product.
 */
export async function unarchiveProduct(businessId: string, productId: string) {
  const context = await requirePermission(businessId, 'PRODUCT_ARCHIVE');

  const existing = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existing || existing.businessId !== businessId) {
    throw new AppError('Product not found in this business', 'NOT_FOUND');
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      archived: false,
      updatedById: context.userId,
    },
  });

  await logAuditEvent({
    action: 'PRODUCT_UNARCHIVE',
    businessId,
    userId: context.userId,
    details: { productId, name: updated.name },
  });

  revalidatePath('/products');
  revalidatePath(`/products/${productId}`);
  revalidatePath('/inventory');

  return updated;
}

/**
 * Lists the active products for a business, mirroring the query the POS page
 * and the products list page use. Used by the POS terminal to refresh its
 * product cache after a stale-stock checkout failure so the cashier always
 * sees current stock. The server remains the final authority on stock.
 */
export async function listProducts(businessId: string) {
  const context = await requirePermission(businessId, 'PRODUCT_READ');
  const products = await prisma.product.findMany({
    where: { businessId, archived: false },
    orderBy: { name: 'asc' },
  });
  return products.map(serializeProduct);
}
