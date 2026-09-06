import { Prisma } from '@prisma/client';
import { toDecimal, DecimalLike } from '@/lib/inventory/valuation';

export type TaxCategory =
  | 'GST_5'
  | 'GST_12'
  | 'GST_18'
  | 'GST_28'
  | 'EXEMPT'
  | 'NIL'
  | 'STANDARD';

/**
 * Returns the standard tax rate percentage for a given tax category.
 */
export function getTaxRateForCategory(taxCategory?: string | null): Prisma.Decimal {
  if (!taxCategory) return new Prisma.Decimal(18);

  switch (taxCategory.toUpperCase()) {
    case 'GST_5':
      return new Prisma.Decimal(5);
    case 'GST_12':
      return new Prisma.Decimal(12);
    case 'GST_18':
    case 'STANDARD':
      return new Prisma.Decimal(18);
    case 'GST_28':
      return new Prisma.Decimal(28);
    case 'EXEMPT':
    case 'NIL':
      return new Prisma.Decimal(0);
    default:
      return new Prisma.Decimal(18);
  }
}

export interface LineItemInput {
  quantity: DecimalLike;
  unitPrice: DecimalLike;
  discount?: DecimalLike;
  taxRate?: DecimalLike;
  taxCategory?: string | null;
}

export interface ComputedLineItem {
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  lineSubtotal: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

export function calculateLineItemTotals(item: LineItemInput): ComputedLineItem {
  const quantity = toDecimal(item.quantity);
  const unitPrice = toDecimal(item.unitPrice);
  const discount = item.discount ? toDecimal(item.discount) : new Prisma.Decimal(0);

  const rawSubtotal = quantity.mul(unitPrice);
  const lineSubtotal = Prisma.Decimal.max(0, rawSubtotal.minus(discount));

  const taxRate = item.taxRate !== undefined
    ? toDecimal(item.taxRate)
    : getTaxRateForCategory(item.taxCategory);

  const taxAmount = lineSubtotal.mul(taxRate).div(100);
  const lineTotal = lineSubtotal.plus(taxAmount);

  return {
    quantity,
    unitPrice,
    discount,
    taxRate,
    taxAmount,
    lineSubtotal,
    lineTotal,
  };
}

export interface InvoiceTotalsInput {
  items: LineItemInput[];
  invoiceDiscount?: DecimalLike;
}

export interface ComputedInvoiceTotals {
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  computedItems: ComputedLineItem[];
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): ComputedInvoiceTotals {
  let subtotal = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);
  let itemDiscounts = new Prisma.Decimal(0);

  const computedItems: ComputedLineItem[] = [];

  for (const rawItem of input.items) {
    const item = calculateLineItemTotals(rawItem);
    computedItems.push(item);

    subtotal = subtotal.plus(item.lineSubtotal);
    taxAmount = taxAmount.plus(item.taxAmount);
    itemDiscounts = itemDiscounts.plus(item.discount);
  }

  const invoiceDiscount = input.invoiceDiscount ? toDecimal(input.invoiceDiscount) : new Prisma.Decimal(0);
  const discountAmount = itemDiscounts.plus(invoiceDiscount);

  const rawGrandTotal = subtotal.plus(taxAmount).minus(invoiceDiscount);
  const totalAmount = Prisma.Decimal.max(0, rawGrandTotal);

  return {
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
    computedItems,
  };
}

export function calculateBalanceDue(totalAmount: DecimalLike, paidAmount: DecimalLike): Prisma.Decimal {
  const total = toDecimal(totalAmount);
  const paid = toDecimal(paidAmount);
  return Prisma.Decimal.max(0, total.minus(paid));
}

export interface TaxBreakdown {
  taxableAmount: Prisma.Decimal;
  cgstRate: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstRate: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstRate: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  totalTax: Prisma.Decimal;
  isInterState: boolean;
}

/**
 * Normalizes a state string for comparison (trimmed, case-insensitive, first part before comma).
 */
function normalizeState(state?: string | null): string {
  if (!state) return '';
  return state.trim().toLowerCase().split(',')[0].trim();
}

/**
 * Determines whether GST should be split into CGST+SGST (intra-state)
 * or charged as IGST (inter-state) based on seller and buyer states.
 *
 * If either state is missing or unclear, returns a safe default:
 * - If seller has tax registration, defaults to IGST (conservative for B2B)
 * - Otherwise, defaults to intra-state (CGST+SGST)
 */
export function isInterStateTransaction(
  sellerState?: string | null,
  buyerState?: string | null,
  sellerIsRegistered: boolean = false
): boolean {
  const seller = normalizeState(sellerState);
  const buyer = normalizeState(buyerState);

  if (!seller || !buyer) {
    return sellerIsRegistered;
  }

  return seller !== buyer;
}

export interface TaxBreakdownInput {
  taxableAmount: DecimalLike;
  taxRate: DecimalLike;
  sellerState?: string | null;
  buyerState?: string | null;
  sellerIsRegistered?: boolean;
}

/**
 * Calculates a detailed tax breakdown for Indian GST compliance.
 * Splits the total tax into CGST+SGST (intra-state) or IGST (inter-state).
 *
 * Example for ₹1000 at 18% GST:
 * - Intra-state (same state): CGST ₹90 (9%) + SGST ₹90 (9%) = ₹180
 * - Inter-state (different state): IGST ₹180 (18%) = ₹180
 */
export function calculateTaxBreakdown(input: TaxBreakdownInput): TaxBreakdown {
  const taxable = toDecimal(input.taxableAmount);
  const rate = toDecimal(input.taxRate);
  const interState = isInterStateTransaction(
    input.sellerState,
    input.buyerState,
    input.sellerIsRegistered
  );

  if (interState) {
    const igstAmount = taxable.mul(rate).div(100);
    return {
      taxableAmount: taxable,
      cgstRate: new Prisma.Decimal(0),
      cgstAmount: new Prisma.Decimal(0),
      sgstRate: new Prisma.Decimal(0),
      sgstAmount: new Prisma.Decimal(0),
      igstRate: rate,
      igstAmount,
      totalTax: igstAmount,
      isInterState: true,
    };
  }

  const halfRate = rate.div(2);
  const cgstAmount = taxable.mul(halfRate).div(100);
  const sgstAmount = taxable.mul(halfRate).div(100);

  return {
    taxableAmount: taxable,
    cgstRate: halfRate,
    cgstAmount,
    sgstRate: halfRate,
    sgstAmount,
    igstRate: new Prisma.Decimal(0),
    igstAmount: new Prisma.Decimal(0),
    totalTax: cgstAmount.plus(sgstAmount),
    isInterState: false,
  };
}
