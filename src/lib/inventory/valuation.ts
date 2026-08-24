import { Prisma } from '@prisma/client';

export type DecimalLike = Prisma.Decimal | number | string;

export function toDecimal(value: DecimalLike): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(value);
}

/**
 * Calculates the new weighted-average cost when new stock is received.
 *
 * Formula:
 * newAvgCost = (existingQty * existingAvgCost + incomingQty * incomingUnitCost) / (existingQty + incomingQty)
 *
 * Edge cases:
 * - If existingQty <= 0, new average cost is the incomingUnitCost.
 * - If totalQty is 0 or negative, returns the incomingUnitCost or existing cost.
 */
export function calculateWeightedAverageCost(
  existingQty: DecimalLike,
  existingAvgCost: DecimalLike,
  incomingQty: DecimalLike,
  incomingUnitCost: DecimalLike
): Prisma.Decimal {
  const eQty = toDecimal(existingQty);
  const eCost = toDecimal(existingAvgCost);
  const inQty = toDecimal(incomingQty);
  const inCost = toDecimal(incomingUnitCost);

  if (inQty.lessThanOrEqualTo(0)) {
    return eCost;
  }

  if (eQty.lessThanOrEqualTo(0)) {
    return inCost;
  }

  const existingTotalValue = eQty.mul(eCost);
  const incomingTotalValue = inQty.mul(inCost);
  const totalValue = existingTotalValue.plus(incomingTotalValue);
  const totalQty = eQty.plus(inQty);

  if (totalQty.isZero()) {
    return new Prisma.Decimal(0);
  }

  return totalValue.div(totalQty);
}

/**
 * Calculates total valuation for a product or list of products.
 */
export function calculateInventoryValuation(
  stockQuantity: DecimalLike,
  costPrice: DecimalLike
): Prisma.Decimal {
  const qty = toDecimal(stockQuantity);
  const cost = toDecimal(costPrice);

  if (qty.lessThanOrEqualTo(0) || cost.lessThanOrEqualTo(0)) {
    return new Prisma.Decimal(0);
  }

  return qty.mul(cost);
}
