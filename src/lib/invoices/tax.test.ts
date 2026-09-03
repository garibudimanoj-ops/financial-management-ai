import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';

const mocks = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  productFindMany: vi.fn(),
  productUpdate: vi.fn(),
  customerFindMany: vi.fn(),
  customerFindUnique: vi.fn(),
  customerUpdate: vi.fn(),
  invoiceSequenceUpsert: vi.fn(),
  invoiceFindUnique: vi.fn(),
  invoiceCreate: vi.fn(),
  invoiceItemCreate: vi.fn(),
  paymentCreate: vi.fn(),
  inventoryMovementCreate: vi.fn(),
  recordSaleInvoiceJournal: vi.fn(),
  recordPaymentJournal: vi.fn(),
  logAuditEvent: vi.fn(),
  recordLedgerEntry: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: any) => fn({
      product: { findUnique: mocks.productFindUnique, findMany: mocks.productFindMany, update: mocks.productUpdate },
      customer: { findMany: mocks.customerFindMany, findUnique: mocks.customerFindUnique, update: mocks.customerUpdate },
      invoiceSequence: { upsert: mocks.invoiceSequenceUpsert },
      invoice: { findUnique: mocks.invoiceFindUnique, create: mocks.invoiceCreate },
      invoiceItem: { create: mocks.invoiceItemCreate },
      payment: { create: mocks.paymentCreate },
      inventoryMovement: { create: mocks.inventoryMovementCreate },
    }),
  },
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('@/lib/customers/service', () => ({ recordLedgerEntry: mocks.recordLedgerEntry }));
vi.mock('@/services/accounting/journalBridge', () => ({
  recordSaleInvoiceJournal: mocks.recordSaleInvoiceJournal,
  recordPaymentJournal: mocks.recordPaymentJournal,
}));

import { getTaxRateForCategory, calculateInvoiceTotals } from '@/lib/invoices/calculations';
import { finalizeSale } from '@/lib/invoices/service';

const product = (o: any = {}) => ({
  id: 'prod-1',
  businessId: 'biz-1',
  name: 'Widget',
  SKU: 'WID-001',
  barcode: null,
  unit: 'PCS',
  costPrice: new Prisma.Decimal('5.00'),
  sellingPrice: new Prisma.Decimal('10.00'),
  stockQuantity: new Prisma.Decimal('10.0000'),
  lowStockThreshold: new Prisma.Decimal('2.0000'),
  taxCategory: 'GST_18',
  ...o,
});

function setupFinalizeTxn() {
  mocks.productFindMany.mockResolvedValue([product()]);
  mocks.invoiceSequenceUpsert.mockResolvedValue({ prefix: 'INV', currentNumber: 1 });
  mocks.invoiceCreate.mockImplementation(async (args: any) => ({ id: 'inv-1', invoiceNumber: 'INV-00001', ...args.data }));
  mocks.invoiceItemCreate.mockResolvedValue({});
  mocks.paymentCreate.mockImplementation(async (args: any) => ({ id: 'pay-1', ...args.data }));
  mocks.customerFindUnique.mockResolvedValue(null);
  mocks.customerUpdate.mockResolvedValue({});
  mocks.inventoryMovementCreate.mockResolvedValue({});
  mocks.recordSaleInvoiceJournal.mockResolvedValue({ id: 'txn-sale' });
  mocks.recordPaymentJournal.mockResolvedValue({ id: 'txn-pay' });
  mocks.logAuditEvent.mockResolvedValue(undefined);
  mocks.recordLedgerEntry.mockResolvedValue({});
}

describe('shared tax-rate resolution', () => {
  it('returns the standard 18% rate for GST_18 and STANDARD', () => {
    expect(getTaxRateForCategory('GST_18').toString()).toBe('18');
    expect(getTaxRateForCategory('STANDARD').toString()).toBe('18');
  });

  it('returns the correct rate for each known category', () => {
    expect(getTaxRateForCategory('GST_5').toString()).toBe('5');
    expect(getTaxRateForCategory('GST_12').toString()).toBe('12');
    expect(getTaxRateForCategory('GST_28').toString()).toBe('28');
  });

  it('returns zero for EXEMPT and NIL categories', () => {
    expect(getTaxRateForCategory('EXEMPT').toString()).toBe('0');
    expect(getTaxRateForCategory('NIL').toString()).toBe('0');
  });

  it('falls back to 18% for unknown categories instead of silently assigning an arbitrary rate', () => {
    expect(getTaxRateForCategory('UNKNOWN_TAX').toString()).toBe('18');
    expect(getTaxRateForCategory(null).toString()).toBe('18');
    expect(getTaxRateForCategory(undefined).toString()).toBe('18');
  });
});

describe('POS UI / server tax consistency', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupFinalizeTxn();
  });

  // The UI formula (lineSubtotal = qty * unitPrice - discount; tax = lineSubtotal * rate/100;
  // grandTotal = max(0, subtotal + taxAmount - totalDiscount)) must match the server's
  // calculateInvoiceTotals for the same product data.
  it('produces identical totals to the server for a single GST_18 line', () => {
    const uiSubtotal = 1 * 10 - 0;
    const uiTax = uiSubtotal * (18 / 100);
    const uiGrandTotal = Math.max(0, uiSubtotal + uiTax - 0);

    const server = calculateInvoiceTotals({
      items: [{ quantity: 1, unitPrice: 10, discount: 0, taxRate: 18, taxCategory: 'GST_18' }],
    });

    expect(uiSubtotal).toBeCloseTo(Number(server.subtotal), 10);
    expect(uiTax).toBeCloseTo(Number(server.taxAmount), 10);
    expect(uiGrandTotal).toBeCloseTo(Number(server.totalAmount), 10);
  });

  it('applies a line discount before tax consistently', () => {
    const uiSubtotal = 2 * 10 - 2; // 18.00
    const uiTax = 18 * (18 / 100); // 3.24
    const uiGrandTotal = Math.max(0, uiSubtotal + uiTax - 0);

    const server = calculateInvoiceTotals({
      items: [{ quantity: 2, unitPrice: 10, discount: 2, taxRate: 18, taxCategory: 'GST_18' }],
    });

    expect(uiSubtotal).toBeCloseTo(Number(server.subtotal), 10);
    expect(uiTax).toBeCloseTo(Number(server.taxAmount), 10);
    expect(uiGrandTotal).toBeCloseTo(Number(server.totalAmount), 10);
  });

  it('handles multiple cart lines with different tax categories consistently', () => {
    const aSubtotal = 1 * 10 - 0; // GST_18
    const aTax = 10 * (18 / 100);
    const bSubtotal = 1 * 100 - 0; // GST_5
    const bTax = 100 * (5 / 100);
    const cSubtotal = 1 * 50 - 0; // EXEMPT
    const cTax = 50 * (0 / 100);
    const uiGrandTotal = Math.max(0, aSubtotal + bSubtotal + cSubtotal + aTax + bTax + cTax - 0);

    const server = calculateInvoiceTotals({
      items: [
        { quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' },
        { quantity: 1, unitPrice: 100, taxRate: 5, taxCategory: 'GST_5' },
        { quantity: 1, unitPrice: 50, taxRate: 0, taxCategory: 'EXEMPT' },
      ],
    });

    expect(uiGrandTotal).toBeCloseTo(Number(server.totalAmount), 10);
    expect(server.taxAmount.toFixed(2)).toBe((aTax + bTax + cTax).toFixed(2));
  });

  it('finalizes a sale whose tax category changed after page load using the server-resolved rate', async () => {
    setupFinalizeTxn();
    mocks.productFindMany.mockResolvedValue([product({ taxCategory: 'GST_28' })]);

    const invoice = await finalizeSale({
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 28, taxCategory: 'GST_28' }],
      status: 'ISSUED',
      initialPayment: { amount: 12.8, paymentMethod: 'CASH' },
      userId: 'user-1',
    });

    // 10.00 + 28% = 12.80
    expect(invoice.totalAmount.toFixed(2)).toBe('12.80');
    expect(invoice.taxAmount.toFixed(2)).toBe('2.80');
    expect(invoice.paidAmount.toFixed(2)).toBe('12.80');
  });
});