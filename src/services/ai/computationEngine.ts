import { Prisma } from '@prisma/client';
import { CalculationInput, CalculationResult } from '@/types/ai';

/**
 * Computation Engine
 * Provides 100% deterministic, high-precision financial calculations using Prisma.Decimal.
 * NOTE: LLMs must NEVER perform arithmetic directly; all numeric logic must invoke this engine.
 */

export function computeTaxBreakdown(
  subtotal: number | string | Prisma.Decimal,
  taxRate: number | string | Prisma.Decimal,
  isInterState = false,
  discount: number | string | Prisma.Decimal = 0,
  tdsRate: number | string | Prisma.Decimal = 0
): CalculationResult {
  const sub = new Prisma.Decimal(subtotal.toString());
  const disc = new Prisma.Decimal(discount.toString());
  const rate = new Prisma.Decimal(taxRate.toString());
  const tds = new Prisma.Decimal(tdsRate.toString());

  const taxableAmount = Prisma.Decimal.max(0, sub.minus(disc));
  const totalTaxAmount = taxableAmount.mul(rate).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  let cgstAmount = new Prisma.Decimal(0);
  let sgstAmount = new Prisma.Decimal(0);
  let igstAmount = new Prisma.Decimal(0);

  if (isInterState) {
    igstAmount = totalTaxAmount;
  } else {
    cgstAmount = totalTaxAmount.div(2).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    sgstAmount = totalTaxAmount.minus(cgstAmount);
  }

  // TDS Deduction
  const tdsAmount = taxableAmount.mul(tds).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  // Final Payable = Taxable + Tax - TDS
  const finalPayableAmount = taxableAmount.plus(totalTaxAmount).minus(tdsAmount);

  return {
    taxableAmount: taxableAmount.toFixed(2),
    cgstAmount: cgstAmount.toFixed(2),
    sgstAmount: sgstAmount.toFixed(2),
    igstAmount: igstAmount.toFixed(2),
    totalTaxAmount: totalTaxAmount.toFixed(2),
    tdsAmount: tdsAmount.toFixed(2),
    finalPayableAmount: finalPayableAmount.toFixed(2),
    verification_status: 'VERIFIED',
  };
}

/**
 * Computes exact line item calculations.
 */
export function computeLineItem(
  quantity: number | string | Prisma.Decimal,
  unitPrice: number | string | Prisma.Decimal,
  discountPercent: number | string | Prisma.Decimal = 0,
  taxRatePercent: number | string | Prisma.Decimal = 0
) {
  const qty = new Prisma.Decimal(quantity.toString());
  const price = new Prisma.Decimal(unitPrice.toString());
  const discPct = new Prisma.Decimal(discountPercent.toString());
  const taxPct = new Prisma.Decimal(taxRatePercent.toString());

  const gross = qty.mul(price);
  const discountAmount = gross.mul(discPct).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const netAmount = gross.minus(discountAmount);
  const taxAmount = netAmount.mul(taxPct).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const lineTotal = netAmount.plus(taxAmount);

  return {
    gross: gross.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    netAmount: netAmount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    lineTotal: lineTotal.toFixed(2),
  };
}
