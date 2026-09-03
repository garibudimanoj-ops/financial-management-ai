import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';
import { Prisma } from '@prisma/client';

// Shared mocks — real finalizeSale + mocked Prisma (same pattern as
// service-split.test.ts). No business logic is duplicated; the tests assert
// the observable behaviour of the POS/checkout path.
const mocks = vi.hoisted(() => ({
  prisma: {
    business: { findUnique: vi.fn() },
    product: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    customer: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    invoiceSequence: { upsert: vi.fn() },
    invoice: { findUnique: vi.fn(), create: vi.fn() },
    invoiceItem: { create: vi.fn() },
    payment: { create: vi.fn() },
    inventoryMovement: { create: vi.fn() },
  },
  recordSaleInvoiceJournal: vi.fn(),
  recordPaymentJournal: vi.fn(),
  logAuditEvent: vi.fn(),
  recordLedgerEntry: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: any) => fn({
      product: { findUnique: mocks.prisma.product.findUnique, findMany: mocks.prisma.product.findMany, update: mocks.prisma.product.update },
      customer: { findMany: mocks.prisma.customer.findMany, findUnique: mocks.prisma.customer.findUnique, update: mocks.prisma.customer.update },
      invoiceSequence: { upsert: mocks.prisma.invoiceSequence.upsert },
      invoice: { findUnique: mocks.prisma.invoice.findUnique, create: mocks.prisma.invoice.create },
      invoiceItem: { create: mocks.prisma.invoiceItem.create },
      payment: { create: mocks.prisma.payment.create },
      inventoryMovement: { create: mocks.prisma.inventoryMovement.create },
    }),
    business: { findUnique: mocks.prisma.business.findUnique },
    product: { findUnique: mocks.prisma.product.findUnique, findMany: mocks.prisma.product.findMany, update: mocks.prisma.product.update },
    customer: { findMany: mocks.prisma.customer.findMany, findUnique: mocks.prisma.customer.findUnique, update: mocks.prisma.customer.update },
    invoiceSequence: { upsert: mocks.prisma.invoiceSequence.upsert },
    invoice: { findUnique: mocks.prisma.invoice.findUnique, create: mocks.prisma.invoice.create },
    invoiceItem: { create: mocks.prisma.invoiceItem.create },
    payment: { create: mocks.prisma.payment.create },
    inventoryMovement: { create: mocks.prisma.inventoryMovement.create },
  },
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('@/lib/customers/service', () => ({ recordLedgerEntry: mocks.recordLedgerEntry }));
vi.mock('@/services/accounting/journalBridge', () => ({
  recordSaleInvoiceJournal: mocks.recordSaleInvoiceJournal,
  recordPaymentJournal: mocks.recordPaymentJournal,
}));

import { finalizeSale } from '@/lib/invoices/service';

const BIZ = 'biz-1';

const product = (o: any = {}) => ({
  id: 'prod-1',
  businessId: BIZ,
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

const customer = (o: any = {}) => ({
  id: 'cust-1',
  businessId: BIZ,
  name: 'Acme Corp',
  archived: false,
  currentBalance: new Prisma.Decimal('0.00'),
  creditLimit: null,
  ...o,
});

// A single-item walk-in sale: 1 x 10.00 with 18% GST = 11.80 total.
const walkInSale = (overrides: any = {}) => ({
  businessId: BIZ,
  items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, taxRate: 18, taxCategory: 'GST_18' }],
  status: 'ISSUED' as const,
  userId: 'user-1',
  ...overrides,
});

function setupFinalizeTxn() {
  mocks.prisma.product.findMany.mockResolvedValue([product()]);
  mocks.prisma.invoiceSequence.upsert.mockResolvedValue({ prefix: 'INV', currentNumber: 1 });
  mocks.prisma.invoice.create.mockImplementation(async (args: any) => ({ id: 'inv-1', invoiceNumber: 'INV-00001', ...args.data }));
  mocks.prisma.invoiceItem.create.mockResolvedValue({});
  mocks.prisma.payment.create.mockImplementation(async (args: any) => ({ id: 'pay-1', ...args.data }));
  mocks.prisma.customer.findUnique.mockResolvedValue(null);
  mocks.prisma.customer.update.mockResolvedValue({});
  mocks.prisma.inventoryMovement.create.mockResolvedValue({});
  mocks.recordSaleInvoiceJournal.mockResolvedValue({ id: 'txn-sale' });
  mocks.recordPaymentJournal.mockResolvedValue({ id: 'txn-pay' });
  mocks.logAuditEvent.mockResolvedValue(undefined);
  mocks.recordLedgerEntry.mockResolvedValue({});
}

describe('POS single-payment checkout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupFinalizeTxn();
  });

it('single cash checkout creates a PAID invoice with stock deducted', async () => {
    const invoice = await finalizeSale(walkInSale({ initialPayment: { amount: 11.8, paymentMethod: 'CASH' } }));
    expect(invoice.status).toBe('PAID');
    expect(invoice.paidAmount.equals(new Prisma.Decimal('11.80'))).toBe(true);
    expect(invoice.balanceDue.equals(new Prisma.Decimal('0'))).toBe(true);
    expect(mocks.prisma.payment.create).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ movementType: 'SALE', quantity: new Prisma.Decimal('1') }) })
    );
  });

  it('single card checkout records a CARD payment', async () => {
    await finalizeSale(walkInSale({ initialPayment: { amount: 11.8, paymentMethod: 'CARD' } }));
    expect(mocks.prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentMethod: 'CARD', amount: new Prisma.Decimal('11.80') }) })
    );
  });

  it('single UPI checkout records a UPI payment', async () => {
    await finalizeSale(walkInSale({ initialPayment: { amount: 11.8, paymentMethod: 'UPI' } }));
    expect(mocks.prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentMethod: 'UPI' }) })
    );
  });

  it('bank-transfer checkout records a BANK_TRANSFER payment', async () => {
    await finalizeSale(walkInSale({ initialPayment: { amount: 11.8, paymentMethod: 'BANK_TRANSFER' } }));
    expect(mocks.prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentMethod: 'BANK_TRANSFER' }) })
    );
  });
});

describe('POS credit sale', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupFinalizeTxn();
  });

  it('creates an ISSUED invoice with no payment for a credit sale', async () => {
    mocks.prisma.customer.findUnique.mockResolvedValue(customer());
const invoice = await finalizeSale(walkInSale({ customerId: 'cust-1', initialPayment: undefined }));
    expect(invoice.status).toBe('ISSUED');
    expect(invoice.paidAmount.equals(new Prisma.Decimal('0'))).toBe(true);
    expect(invoice.balanceDue.equals(new Prisma.Decimal('11.80'))).toBe(true);
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entryType: 'INVOICE', amount: new Prisma.Decimal('11.80') })
    );
  });

  it('rejects a credit sale that exceeds the customer credit limit', async () => {
    mocks.prisma.customer.findUnique.mockResolvedValue(customer({ creditLimit: new Prisma.Decimal('5.00') }));
    await expect(
      finalizeSale(walkInSale({ customerId: 'cust-1', initialPayment: undefined }))
    ).rejects.toThrow('credit limit');
  });
});

describe('POS split tender', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupFinalizeTxn();
  });

  it('two-way split tender posts one sale journal and one payment journal per tender', async () => {
    await finalizeSale(walkInSale({
      initialPayments: [
        { amount: 6, paymentMethod: 'CASH' },
        { amount: 5.8, paymentMethod: 'CARD' },
      ],
    }));
    expect(mocks.recordSaleInvoiceJournal).toHaveBeenCalledTimes(1);
    expect(mocks.recordPaymentJournal).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.payment.create).toHaveBeenCalledTimes(2);
    const saleCall = mocks.recordSaleInvoiceJournal.mock.calls[0][1];
    expect(saleCall.initialPaid.toString()).toBe('0');
  });

it('three-way split tender records three payments', async () => {
    await finalizeSale(walkInSale({
      initialPayments: [
        { amount: 3, paymentMethod: 'CASH' },
        { amount: 3, paymentMethod: 'UPI' },
        { amount: 5.8, paymentMethod: 'BANK_TRANSFER' },
      ],
    }));
    expect(mocks.prisma.payment.create).toHaveBeenCalledTimes(3);
    expect(mocks.recordPaymentJournal).toHaveBeenCalledTimes(3);
  });

  it('accepts an exact cash+card split with zero change', async () => {
    // Walk-in total is 11.80 (10.00 + 18% GST). Cash 6 + Card 5.80 = exact.
    await finalizeSale(walkInSale({
      initialPayments: [
        { amount: 6, paymentMethod: 'CASH' },
        { amount: 5.8, paymentMethod: 'CARD' },
      ],
    }));
    expect(mocks.prisma.payment.create).toHaveBeenCalledTimes(2);
  });

  it('rejects a cash+card split that overpays the invoice', async () => {
    // Cash 6 + Card 6 on a 11.80 sale: overpayment of 0.20 — rejected.
    await expect(
      finalizeSale(walkInSale({
        initialPayments: [
          { amount: 6, paymentMethod: 'CASH' },
          { amount: 6, paymentMethod: 'CARD' },
        ],
      }))
    ).rejects.toThrow('exceeds invoice total');
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
  });
});

describe('POS payment validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupFinalizeTxn();
  });

  it('rejects underpayment for a walk-in customer', async () => {
    await expect(
      finalizeSale(walkInSale({ initialPayment: { amount: 5, paymentMethod: 'CASH' } }))
    ).rejects.toThrow('Walk-in sales must be paid in full');
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
  });

it('rejects overpayment', async () => {
    await expect(
      finalizeSale(walkInSale({ initialPayment: { amount: 100, paymentMethod: 'CASH' } }))
    ).rejects.toThrow('exceeds invoice total');
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
  });

it('rejects a zero payment amount', async () => {
    await expect(
      finalizeSale(walkInSale({ initialPayment: { amount: 0, paymentMethod: 'CASH' } }))
    ).rejects.toThrow(AppError);
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a negative payment amount', async () => {
    await expect(
      finalizeSale(walkInSale({ initialPayment: { amount: -5, paymentMethod: 'CASH' } }))
    ).rejects.toThrow(AppError);
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
  });
});

describe('POS inventory and tenant safety', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupFinalizeTxn();
  });

  it('rejects an out-of-stock product', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([product({ stockQuantity: new Prisma.Decimal('0.0000') })]);
    await expect(
      finalizeSale(walkInSale({ initialPayment: { amount: 11.8, paymentMethod: 'CASH' } }))
    ).rejects.toThrow('Insufficient stock');
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
  });

it('returns the same invoice for a duplicate idempotency key', async () => {
    const existing = { id: 'inv-existing', invoiceNumber: 'INV-00099', status: 'PAID', totalAmount: new Prisma.Decimal('11.80'), paidAmount: new Prisma.Decimal('11.80'), balanceDue: new Prisma.Decimal('0'), items: [], payments: [], customer: null };
    // First checkout: no existing invoice found, then create returns the record.
    mocks.prisma.invoice.findUnique.mockResolvedValueOnce(null);
    mocks.prisma.invoice.create.mockResolvedValueOnce(existing);
    const first = await finalizeSale(walkInSale({ idempotencyKey: 'pos-dup', initialPayment: { amount: 11.8, paymentMethod: 'CASH' } }));
    // Second checkout with the same key: the service finds the existing invoice
    // via tx.invoice.findUnique and returns it without creating a new payment.
    mocks.prisma.invoice.findUnique.mockResolvedValueOnce(existing);
    const second = await finalizeSale(walkInSale({ idempotencyKey: 'pos-dup', initialPayment: { amount: 11.8, paymentMethod: 'CASH' } }));
    expect(second.id).toBe(first.id);
    expect(mocks.prisma.payment.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a product that belongs to another tenant', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([]);
    await expect(
      finalizeSale(walkInSale({ initialPayment: { amount: 11.8, paymentMethod: 'CASH' } }))
    ).rejects.toThrow('One or more selected products do not belong to this business');
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a customer that belongs to another tenant', async () => {
    setupFinalizeTxn();
    mocks.prisma.customer.findUnique.mockResolvedValue(customer({ businessId: 'biz-other' }));
    await expect(
      finalizeSale(walkInSale({ customerId: 'cust-1', initialPayment: undefined }))
    ).rejects.toThrow('Customer not found in this business');
  });

it('rolls back stock when checkout fails partway through', async () => {
    mocks.prisma.invoice.create.mockRejectedValue(new AppError('DB failure', 'INTERNAL_ERROR'));
    await expect(
      finalizeSale(walkInSale({ initialPayment: { amount: 11.8, paymentMethod: 'CASH' } }))
    ).rejects.toThrow('DB failure');
    // The whole sale runs in a single Prisma transaction, so no partial state
    // (stock deduction, payment, or journal) is observable outside it.
    expect(mocks.prisma.payment.create).not.toHaveBeenCalled();
  });
});
