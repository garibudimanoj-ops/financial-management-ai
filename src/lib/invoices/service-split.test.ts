import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';

const mocks = vi.hoisted(() => ({
  recordSaleInvoiceJournal: vi.fn(),
  recordPaymentJournal: vi.fn(),
  logAuditEvent: vi.fn(),
  recordLedgerEntry: vi.fn(),
  productFindUnique: vi.fn(),
  productFindMany: vi.fn(),
  productUpdate: vi.fn(),
  invoiceSequenceUpsert: vi.fn(),
  invoiceCreate: vi.fn(),
  invoiceItemCreate: vi.fn(),
  paymentCreate: vi.fn(),
  customerFindUnique: vi.fn(),
  customerUpdate: vi.fn(),
  inventoryMovementCreate: vi.fn(),
}));

vi.mock('@/services/accounting/journalBridge', () => ({
  recordSaleInvoiceJournal: mocks.recordSaleInvoiceJournal,
  recordPaymentJournal: mocks.recordPaymentJournal,
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('@/lib/customers/service', () => ({ recordLedgerEntry: mocks.recordLedgerEntry }));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(tx),
    product: { findUnique: mocks.productFindUnique, findMany: mocks.productFindMany, update: mocks.productUpdate },
    invoiceSequence: { upsert: mocks.invoiceSequenceUpsert },
    invoice: { create: mocks.invoiceCreate },
    invoiceItem: { create: mocks.invoiceItemCreate },
    payment: { create: mocks.paymentCreate },
    customer: { findUnique: mocks.customerFindUnique, update: mocks.customerUpdate },
    inventoryMovement: { create: mocks.inventoryMovementCreate },
  },
}));

import { finalizeSale } from './service';

let tx: any;

const product = (overrides: any = {}) => ({
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
  ...overrides,
});

const setupProducts = () => {
  mocks.productFindMany.mockResolvedValue([product()]);
  mocks.productFindUnique.mockResolvedValue(product());
};

describe('finalizeSale split tender', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.recordSaleInvoiceJournal.mockResolvedValue({ id: 'txn-sale' });
    mocks.recordPaymentJournal.mockResolvedValue({ id: 'txn-pay' });
    mocks.logAuditEvent.mockResolvedValue(undefined);
    mocks.recordLedgerEntry.mockResolvedValue({});
    mocks.invoiceSequenceUpsert.mockResolvedValue({ prefix: 'INV', currentNumber: 1 });
    mocks.invoiceCreate.mockImplementation(async (args: any) => ({ id: 'inv-1', invoiceNumber: 'INV-00001', ...args.data }));
    mocks.invoiceItemCreate.mockResolvedValue({});
    mocks.paymentCreate.mockImplementation(async (args: any) => ({ id: 'pay-1', ...args.data }));
    mocks.customerFindUnique.mockResolvedValue(null);
    mocks.customerUpdate.mockResolvedValue({});
    mocks.inventoryMovementCreate.mockResolvedValue({});

    tx = {
      product: { findUnique: mocks.productFindUnique, findMany: mocks.productFindMany, update: mocks.productUpdate },
      invoiceSequence: { upsert: mocks.invoiceSequenceUpsert },
      invoice: { create: mocks.invoiceCreate },
      invoiceItem: { create: mocks.invoiceItemCreate },
      payment: { create: mocks.paymentCreate },
      customer: { findUnique: mocks.customerFindUnique, update: mocks.customerUpdate },
      inventoryMovement: { create: mocks.inventoryMovementCreate },
    };
  });

  it('posts a balanced sale journal and one journal per split payment', async () => {
    setupProducts();

    await finalizeSale({
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' }],
      status: 'ISSUED',
      initialPayments: [
        { amount: 6, paymentMethod: 'CASH' },
        { amount: 5.8, paymentMethod: 'CARD' },
      ],
      userId: 'user-1',
    });

    // One sale journal (full invoice to AR), plus one payment journal per tender.
    expect(mocks.recordSaleInvoiceJournal).toHaveBeenCalledTimes(1);
    expect(mocks.recordPaymentJournal).toHaveBeenCalledTimes(2);

    const saleCall = mocks.recordSaleInvoiceJournal.mock.calls[0][1];
    // Split tender posts the full invoice to AR and zero cash in the sale journal.
    expect(saleCall.initialPaid.toString()).toBe('0');
    expect(saleCall.paymentMethod).toBeUndefined();

    const paymentCalls = mocks.recordPaymentJournal.mock.calls.map((c) => c[1]);
    expect(Number(paymentCalls[0].amount)).toBe(6);
    expect(Number(paymentCalls[1].amount)).toBe(5.8);
    expect(mocks.paymentCreate).toHaveBeenCalledTimes(2);
  });

  it('rejects a split tender that underpays the sale', async () => {
    setupProducts();

    await expect(
      finalizeSale({
        businessId: 'biz-1',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' }],
        status: 'ISSUED',
        initialPayments: [{ amount: 5, paymentMethod: 'CASH' }],
        userId: 'user-1',
      })
    ).rejects.toThrow('Walk-in sales must be paid in full');
    expect(mocks.paymentCreate).not.toHaveBeenCalled();
  });

  it('rejects a split tender that overpays the sale', async () => {
    setupProducts();

    await expect(
      finalizeSale({
        businessId: 'biz-1',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' }],
        status: 'ISSUED',
        initialPayments: [
          { amount: 6, paymentMethod: 'CASH' },
          { amount: 6, paymentMethod: 'CARD' },
        ],
        userId: 'user-1',
      })
    ).rejects.toThrow('exceeds invoice total');
  });

  it('rejects a zero split payment amount (silently dropped, leaving underpayment)', async () => {
    setupProducts();

    await expect(
      finalizeSale({
        businessId: 'biz-1',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' }],
        status: 'ISSUED',
        initialPayments: [{ amount: 0, paymentMethod: 'CASH' }],
        userId: 'user-1',
      })
    ).rejects.toThrow(AppError);
    expect(mocks.paymentCreate).not.toHaveBeenCalled();
  });

  it('allows a three-way split tender that exactly equals the sale total', async () => {
    setupProducts();

    await finalizeSale({
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' }],
      status: 'ISSUED',
      initialPayments: [
        { amount: 3, paymentMethod: 'CASH' },
        { amount: 3, paymentMethod: 'UPI' },
        { amount: 5.8, paymentMethod: 'BANK_TRANSFER' },
      ],
      userId: 'user-1',
    });

    expect(mocks.paymentCreate).toHaveBeenCalledTimes(3);
    expect(mocks.recordPaymentJournal).toHaveBeenCalledTimes(3);
  });

  it('rejects split tender for a product in another tenant', async () => {
    mocks.productFindMany.mockResolvedValue([]);

    await expect(
      finalizeSale({
        businessId: 'biz-1',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' }],
        status: 'ISSUED',
        initialPayments: [
          { amount: 6, paymentMethod: 'CASH' },
          { amount: 5.8, paymentMethod: 'CARD' },
        ],
        userId: 'user-1',
      })
    ).rejects.toThrow('One or more selected products do not belong to this business');
  });

  it('single full-cash payment still posts one sale journal and no separate payment journal', async () => {
    setupProducts();

    await finalizeSale({
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' }],
      status: 'ISSUED',
      initialPayment: { amount: 11.8, paymentMethod: 'CASH' },
      userId: 'user-1',
    });

    // Single full-cash: the sale journal carries the cash directly, so no
    // separate PAYMENT journal is posted (split tender is the only path that
    // posts one journal per tender).
    expect(mocks.recordSaleInvoiceJournal).toHaveBeenCalledTimes(1);
    expect(mocks.recordPaymentJournal).not.toHaveBeenCalled();
    expect(mocks.paymentCreate).toHaveBeenCalledTimes(1);
  });
});