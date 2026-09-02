import { Prisma } from '@prisma/client';
import { DecimalLike, toDecimal } from '@/lib/inventory/valuation';
import { AppError } from '@/lib/errors';

export interface PurchaseCalculationItem {
  quantity: DecimalLike;
  unitCost: DecimalLike;
  /** Discount is a currency amount for the entire line, never per unit. */
  discount?: DecimalLike;
  taxRate?: DecimalLike;
}

export interface PurchaseTotals {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  items: Array<{
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    discount: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    lineSubtotal: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>;
}

/** Authoritative purchase calculation. UI previews must use the same line-discount rule. */
export function calculatePurchaseTotals(items: PurchaseCalculationItem[]): PurchaseTotals {
  if (items.length === 0) throw new AppError('Purchase bill must contain at least one item', 'VALIDATION_ERROR');
  const zero = new Prisma.Decimal(0);
  let subtotal = zero;
  let discountAmount = zero;
  let taxAmount = zero;
  const calculated = items.map((item) => {
    const quantity = toDecimal(item.quantity);
    const unitCost = toDecimal(item.unitCost);
    const discount = item.discount === undefined ? zero : toDecimal(item.discount);
    const taxRate = item.taxRate === undefined ? zero : toDecimal(item.taxRate);
    if (quantity.lessThanOrEqualTo(0)) throw new AppError('Item quantity must be greater than zero', 'VALIDATION_ERROR');
    if (unitCost.lessThan(0) || discount.lessThan(0) || taxRate.lessThan(0)) throw new AppError('Purchase amounts cannot be negative', 'VALIDATION_ERROR');
    const lineGross = quantity.mul(unitCost);
    if (discount.greaterThan(lineGross)) throw new AppError('Line discount cannot exceed line value', 'VALIDATION_ERROR');
    const lineSubtotal = lineGross.minus(discount);
    const lineTax = lineSubtotal.mul(taxRate).div(100);
    const lineTotal = lineSubtotal.plus(lineTax);
    subtotal = subtotal.plus(lineGross);
    discountAmount = discountAmount.plus(discount);
    taxAmount = taxAmount.plus(lineTax);
    return { quantity, unitCost, discount, taxRate, taxAmount: lineTax, lineSubtotal, lineTotal };
  });
  return { subtotal, discountAmount, taxableAmount: subtotal.minus(discountAmount), taxAmount, totalAmount: subtotal.minus(discountAmount).plus(taxAmount), items: calculated };
}

export function calculateIndianGst(taxAmount: Prisma.Decimal, businessState?: string | null, supplierState?: string | null) {
  const normalized = (value?: string | null) => value?.trim().toLocaleLowerCase() || '';
  const intraState = normalized(businessState) !== '' && normalized(businessState) === normalized(supplierState);
  return intraState
    ? { cgstAmount: taxAmount.div(2), sgstAmount: taxAmount.minus(taxAmount.div(2)), igstAmount: new Prisma.Decimal(0) }
    : { cgstAmount: new Prisma.Decimal(0), sgstAmount: new Prisma.Decimal(0), igstAmount: taxAmount };
}
