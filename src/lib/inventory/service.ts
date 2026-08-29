import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';
import { calculateWeightedAverageCost, toDecimal, DecimalLike } from './valuation';
import { MovementType, Prisma } from '@prisma/client';
import { serializeInventoryMovement } from '@/lib/serialize';

export interface AddStockInput {
  businessId: string;
  productId: string;
  quantity: DecimalLike;
  unitCost: DecimalLike;
  batchNumber?: string;
  expiryDate?: Date | null;
  reason?: string;
  reference?: string;
  userId: string;
}

export interface AdjustStockInput {
  businessId: string;
  productId: string;
  movementType: MovementType;
  quantity: DecimalLike;
  unitCost?: DecimalLike;
  reason: string;
  reference?: string;
  userId: string;
}

/**
 * Atomically receives new stock batch, recalculates weighted-average cost,
 * updates product inventory, creates inventory batch, and logs movement + audit.
 */
export async function addStock(input: AddStockInput) {
  const qty = toDecimal(input.quantity);
  const cost = toDecimal(input.unitCost);

  if (qty.lessThanOrEqualTo(0)) {
    throw new AppError('Quantity must be greater than zero for stock addition', 'VALIDATION_ERROR');
  }
  if (cost.lessThan(0)) {
    throw new AppError('Unit cost cannot be negative', 'VALIDATION_ERROR');
  }

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: input.productId,
      },
    });

    if (!product || product.businessId !== input.businessId) {
      throw new AppError('Product not found in this business', 'NOT_FOUND');
    }

    const previousStock = product.stockQuantity;
    const resultingStock = previousStock.plus(qty);
    const newAverageCost = calculateWeightedAverageCost(previousStock, product.costPrice, qty, cost);

    let batchId: string | undefined;

    if (input.batchNumber) {
      const batch = await tx.inventoryBatch.create({
        data: {
          businessId: input.businessId,
          productId: input.productId,
          batchNumber: input.batchNumber,
          quantity: qty,
          remainingQuantity: qty,
          unitCost: cost,
          expiryDate: input.expiryDate || null,
        },
      });
      batchId = batch.id;
    }

    const updatedProduct = await tx.product.update({
      where: { id: input.productId },
      data: {
        stockQuantity: resultingStock,
        costPrice: newAverageCost,
        updatedById: input.userId,
      },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        businessId: input.businessId,
        productId: input.productId,
        batchId: batchId || null,
        movementType: 'STOCK_IN',
        quantity: qty,
        unitCost: cost,
        previousStock,
        resultingStock,
        reason: input.reason || 'Stock received',
        reference: input.reference || null,
        createdById: input.userId,
      },
    });

    return { product: updatedProduct, movement, batchId };
  }).then(async (result) => {
    await logAuditEvent({
      action: 'STOCK_IN',
      businessId: input.businessId,
      userId: input.userId,
      details: {
        productId: input.productId,
        quantity: input.quantity.toString(),
        unitCost: input.unitCost.toString(),
        resultingStock: result.movement.resultingStock.toString(),
      },
    });

    return result;
  });
}

/**
 * Atomically adjusts stock (ADJUSTMENT, DAMAGE, RETURN).
 * Enforces strict negative stock prevention and creates immutable audit movements.
 */
export async function adjustStock(input: AdjustStockInput) {
  const qty = toDecimal(input.quantity);

  if (qty.isZero()) {
    throw new AppError('Adjustment quantity cannot be zero', 'VALIDATION_ERROR');
  }

  if (!input.reason || input.reason.trim() === '') {
    throw new AppError('A valid reason is required for manual stock adjustments', 'VALIDATION_ERROR');
  }

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: input.productId,
      },
    });

    if (!product || product.businessId !== input.businessId) {
      throw new AppError('Product not found in this business', 'NOT_FOUND');
    }

    const previousStock = product.stockQuantity;
    let resultingStock: Prisma.Decimal;
    let newCostPrice = product.costPrice;

    switch (input.movementType) {
      case 'DAMAGE':
        // Damage strictly reduces stock
        if (qty.lessThanOrEqualTo(0)) {
          throw new AppError('Damage quantity must be positive', 'VALIDATION_ERROR');
        }
        resultingStock = previousStock.minus(qty);
        break;

      case 'RETURN':
        // Return increases stock
        if (qty.lessThanOrEqualTo(0)) {
          throw new AppError('Return quantity must be positive', 'VALIDATION_ERROR');
        }
        resultingStock = previousStock.plus(qty);
        if (input.unitCost) {
          const uCost = toDecimal(input.unitCost);
          newCostPrice = calculateWeightedAverageCost(previousStock, product.costPrice, qty, uCost);
        }
        break;

      case 'ADJUSTMENT':
        // Adjustment quantity can be positive (increase) or negative (decrease)
        resultingStock = previousStock.plus(qty);
        break;

      default:
        throw new AppError(`Unsupported adjustment movement type: ${input.movementType}`, 'VALIDATION_ERROR');
    }

    if (resultingStock.lessThan(0)) {
      throw new AppError(
        `Insufficient inventory: Current stock is ${previousStock.toString()}, cannot reduce by ${qty.abs().toString()}`,
        'VALIDATION_ERROR'
      );
    }

    const updatedProduct = await tx.product.update({
      where: { id: input.productId },
      data: {
        stockQuantity: resultingStock,
        costPrice: newCostPrice,
        updatedById: input.userId,
      },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        businessId: input.businessId,
        productId: input.productId,
        movementType: input.movementType,
        quantity: qty.abs(),
        unitCost: input.unitCost ? toDecimal(input.unitCost) : product.costPrice,
        previousStock,
        resultingStock,
        reason: input.reason,
        reference: input.reference || null,
        createdById: input.userId,
      },
    });

    return { product: updatedProduct, movement };
  }).then(async (result) => {
    await logAuditEvent({
      action: `INVENTORY_${input.movementType}`,
      businessId: input.businessId,
      userId: input.userId,
      details: {
        productId: input.productId,
        movementType: input.movementType,
        quantity: input.quantity.toString(),
        reason: input.reason,
        resultingStock: result.movement.resultingStock.toString(),
      },
    });

    return result;
  });
}

/**
 * Gets aggregated inventory summary metrics for a business.
 */
export async function getInventorySummary(businessId: string) {
  const products = await prisma.product.findMany({
    where: { businessId, archived: false },
    select: {
      id: true,
      stockQuantity: true,
      costPrice: true,
      lowStockThreshold: true,
    },
  });

  let totalProducts = products.length;
  let totalUnits = new Prisma.Decimal(0);
  let totalValuation = new Prisma.Decimal(0);
  let lowStockCount = 0;

  for (const p of products) {
    totalUnits = totalUnits.plus(p.stockQuantity);
    totalValuation = totalValuation.plus(p.stockQuantity.mul(p.costPrice));
    if (p.stockQuantity.lessThanOrEqualTo(p.lowStockThreshold)) {
      lowStockCount++;
    }
  }

  const recentMovements = await prisma.inventoryMovement.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      product: {
        select: { id: true, name: true, SKU: true, unit: true },
      },
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  return {
    totalProducts,
    totalUnits,
    totalValuation,
    lowStockCount,
    recentMovements: recentMovements.map(serializeInventoryMovement),
  };
}

/**
 * Gets historical movement records for a business or specific product.
 */
export async function getInventoryMovements(businessId: string, productId?: string, limit = 50, offset = 0) {
  const where: Prisma.InventoryMovementWhereInput = {
    businessId,
    ...(productId ? { productId } : {}),
  };

  const [total, movements] = await Promise.all([
    prisma.inventoryMovement.count({ where }),
    prisma.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        product: {
          select: { id: true, name: true, SKU: true, unit: true },
        },
        createdBy: {
          select: { id: true, email: true, name: true },
        },
      },
    }),
  ]);

  return { total, movements: movements.map(serializeInventoryMovement) as any[] };
}
