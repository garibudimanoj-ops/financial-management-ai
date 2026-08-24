'use server';

import { requirePermission } from '@/lib/auth';
import { addStock, adjustStock } from '@/lib/inventory/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { MovementType } from '@prisma/client';

const addStockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0, 'Unit cost cannot be negative'),
  batchNumber: z.string().nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : undefined)),
  expiryDate: z.string().nullish().transform((v) => (v && v.trim() !== '' ? new Date(v) : undefined)),
  reason: z.string().nullish().default('Stock-in purchase / batch received'),
  reference: z.string().nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : undefined)),
});

export type AddStockFormData = z.input<typeof addStockSchema>;

/**
 * Server action to receive and record new stock batches.
 */
export async function addStockAction(businessId: string, formData: AddStockFormData) {
  const context = await requirePermission(businessId, 'INVENTORY_READ');
  const parsed = addStockSchema.parse(formData);

  const result = await addStock({
    businessId,
    productId: parsed.productId,
    quantity: parsed.quantity,
    unitCost: parsed.unitCost,
    batchNumber: parsed.batchNumber || undefined,
    expiryDate: parsed.expiryDate || undefined,
    reason: parsed.reason || undefined,
    reference: parsed.reference || undefined,
    userId: context.userId,
  });

  revalidatePath('/products');
  revalidatePath(`/products/${parsed.productId}`);
  revalidatePath('/inventory');
  revalidatePath('/inventory/movements');
  revalidatePath('/dashboard');

  return result;
}

const adjustStockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  movementType: z.enum(['ADJUSTMENT', 'DAMAGE', 'RETURN'] as const),
  quantity: z.coerce.number().refine((val) => val !== 0, 'Quantity cannot be zero'),
  unitCost: z.coerce.number().min(0).optional(),
  reason: z.string().min(1, 'A valid reason is required for manual adjustments'),
  reference: z.string().nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : undefined)),
});

export type AdjustStockFormData = z.input<typeof adjustStockSchema>;

/**
 * Server action to record manual stock adjustments, damage, or customer/supplier returns.
 */
export async function adjustStockAction(businessId: string, formData: AdjustStockFormData) {
  const context = await requirePermission(businessId, 'INVENTORY_ADJUST');
  const parsed = adjustStockSchema.parse(formData);

  const result = await adjustStock({
    businessId,
    productId: parsed.productId,
    movementType: parsed.movementType as MovementType,
    quantity: parsed.quantity,
    unitCost: parsed.unitCost,
    reason: parsed.reason,
    reference: parsed.reference || undefined,
    userId: context.userId,
  });

  revalidatePath('/products');
  revalidatePath(`/products/${parsed.productId}`);
  revalidatePath('/inventory');
  revalidatePath('/inventory/movements');
  revalidatePath('/dashboard');

  return result;
}
