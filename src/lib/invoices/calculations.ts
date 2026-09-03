import { Prisma } from '@prisma/client';
import { toDecimal, DecimalLike } from '@/lib/inventory/valuation';

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

/**
 * Calculates line totals and tax for an invoice item using Decimal arithmetic.
 */
export function calculateLineItemTotals(item: LineItemInput): ComputedLineItem {
  const quantity = toDecimal(item.quantity);
  const unitPrice = toDecimal(item.unitPrice);
  const discount = item.discount ? toDecimal(item.discount) : new Prisma.Decimal(0);

  const rawSubtotal = quantity.mul(unitPrice);
  const lineSubtotal = Prisma.Decimal.max(0, rawSubtotal.minus(discount));

  const taxRate = item.taxRate !== undefined
    ? toDecimal(item.taxRate)
    : getTaxRateForCategory(item.taxCategory);

  // taxAmount = lineSubtotal * (taxRate / 100)
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

/**
 * Computes authoritative invoice totals from a collection of items and an overall discount.
 */
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

  // grand total = max(0, subtotal + taxAmount - invoiceDiscount)
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

/**
 * Calculates remaining balance due on an invoice given payments made.
 */
export function calculateBalanceDue(totalAmount: DecimalLike, paidAmount: DecimalLike): Prisma.Decimal {
  const total = toDecimal(totalAmount);
  const paid = toDecimal(paidAmount);
  return Prisma.Decimal.max(0, total.minus(paid));
}

const OPEN_INVOICE_STATUSES = new Set(['ISSUED', 'PARTIALLY_PAID']);

/**
 * Overdue is a derived display state: an unpaid issued invoice whose due date has passed.
 * The persisted InvoiceStatus enum does not include OVERDUE.
 */
export function isInvoiceOverdue(input: {
  status: string;
  dueDate?: Date | string | null;
  balanceDue?: DecimalLike | null;
  now?: Date;
}): boolean {
  if (!OPEN_INVOICE_STATUSES.has(input.status)) return false;
  if (!input.dueDate) return false;
  if (input.balanceDue !== undefined && input.balanceDue !== null && toDecimal(input.balanceDue).lessThanOrEqualTo(0)) {
    return false;
  }
  const due = input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const now = input.now ?? new Date();
  return due.getTime() < now.getTime();
}
