import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';

const mocks = vi.hoisted(() => ({
  reverseSourceJournal: vi.fn(),
  logAuditEvent: vi.fn(),
  recordLedgerEntry: vi.fn(),
  paymentFindUnique: vi.fn(),
  invoiceFindUnique: vi.fn(),
  invoiceUpdate: vi.fn(),
  paymentUpdate: vi.fn(),
}));

vi.mock('@/services/accounting/journalBridge', () => ({
  reverseSourceJournal: mocks.reverseSourceJournal,
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('@/lib/customers/service', () => ({ recordLedgerEntry: mocks.recordLedgerEntry }));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(tx),
    payment: { findUnique: mocks.paymentFindUnique, update: mocks.paymentUpdate },
    invoice: { findUnique: mocks.invoiceFindUnique, update: mocks.invoiceUpdate },
  },
}));

import { reversePayment } from './service';

let tx: any;

const payment = (overrides: any = {}) => ({
  id: 'pay-1',
  businessId: 'biz-1',
  invoiceId: 'inv-1',
  customerId: 'cust-1',
  amount: new Prisma.Decimal('100.00'),
  paymentMethod: 'CASH',
  reference: null,
  notes: null,
  idempotencyKey: null,
  receivedAt: new Date(),
  createdById: 'user-1',
  createdAt: new Date(),
  reversedAt: null,
  reversalReason: null,
  ...overrides,
});

const invoice = (overrides: any = {}) => ({
  id: 'inv-1',
  businessId: 'biz-1',
  invoiceNumber: 'INV-00001',
  status: 'PAID',
  totalAmount: new Prisma.Decimal('100.00'),
  paidAmount: new Prisma.Decimal('100.00'),
  balanceDue: new Prisma.Decimal('0'),
  customerId: 'cust-1',
  ...overrides,
});

describe('reversePayment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.reverseSourceJournal.mockResolvedValue({ id: 'rev-1' });
    mocks.logAuditEvent.mockResolvedValue(undefined);
    mocks.recordLedgerEntry.mockResolvedValue({});
    mocks.paymentUpdate.mockImplementation(async (args: any) => ({ ...payment(), ...args.data }));

    tx = {
      payment: { findUnique: mocks.paymentFindUnique, update: mocks.paymentUpdate },
      invoice: { findUnique: mocks.invoiceFindUnique, update: mocks.invoiceUpdate },
    };
  });

  it('rejects an empty reversal reason', async () => {
    await expect(reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: '   ', userId: 'user-1' }))
      .rejects.toThrow(AppError);
    expect(mocks.paymentUpdate).not.toHaveBeenCalled();
  });

  it('rejects a payment belonging to another tenant', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ ...payment(), businessId: 'biz-other' });

    await expect(reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Payment not found in this business');
    expect(mocks.paymentUpdate).not.toHaveBeenCalled();
  });

  it('rejects an already-reversed payment', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ ...payment(), reversedAt: new Date() });

    await expect(reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Payment has already been reversed');
    expect(mocks.reverseSourceJournal).not.toHaveBeenCalled();
  });

  it('rejects a payment not linked to an invoice', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ ...payment(), invoiceId: null });

    await expect(reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Payment is not linked to an invoice');
  });

  it('rejects a payment against a cancelled or refunded invoice', async () => {
    mocks.paymentFindUnique.mockResolvedValue(payment());
    mocks.invoiceFindUnique.mockResolvedValue({ ...invoice(), status: 'CANCELLED' });

    await expect(reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Cannot reverse a payment against an invoice with status CANCELLED');
  });

  it('rejects a reversal that would make paidAmount negative', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ ...payment(), amount: new Prisma.Decimal('150.00') });
    mocks.invoiceFindUnique.mockResolvedValue({ ...invoice(), paidAmount: new Prisma.Decimal('100.00') });

    await expect(reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('invoice paidAmount');
    expect(mocks.reverseSourceJournal).not.toHaveBeenCalled();
  });

  it('fails safely when the posted payment journal cannot be found', async () => {
    mocks.paymentFindUnique.mockResolvedValue(payment());
    mocks.invoiceFindUnique.mockResolvedValue(invoice());
    mocks.reverseSourceJournal.mockResolvedValue(null);

    await expect(reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Posted payment journal for this payment was not found');
    expect(mocks.paymentUpdate).not.toHaveBeenCalled();
    expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
  });

  it('reverses a full payment: paidAmount to zero, status to ISSUED, ledger offset, journal reversed, payment marked', async () => {
    mocks.paymentFindUnique.mockResolvedValue(payment());
    mocks.invoiceFindUnique.mockResolvedValue({ ...invoice(), status: 'PAID', paidAmount: new Prisma.Decimal('100.00'), balanceDue: new Prisma.Decimal('0') });

    const result = await reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'duplicate entry', userId: 'user-1' });

    expect(result.invoice.status).toBe('ISSUED');
    expect(result.invoice.paidAmount.equals(new Prisma.Decimal('0'))).toBe(true);
    expect(result.invoice.balanceDue.equals(new Prisma.Decimal('100'))).toBe(true);
    expect(result.payment.reversedAt).toBeInstanceOf(Date);
    expect(result.payment.reversedById).toBe('user-1');
    expect(result.payment.reversalReason).toBe('duplicate entry');

    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ entryType: 'DEBIT', amount: new Prisma.Decimal('100.00') })
    );
    expect(mocks.reverseSourceJournal).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ sourceType: 'PAYMENT', sourceId: 'pay-1', reversalSourceType: 'PAYMENT_REVERSAL' })
    );
    expect(mocks.invoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAmount: new Prisma.Decimal('0'),
          balanceDue: new Prisma.Decimal('100.00'),
          status: 'ISSUED',
        }),
      })
    );
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_REVERSE' }));
  });

  it('reverses a partial payment: status stays PARTIALLY_PAID and paidAmount decreases', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ ...payment(), amount: new Prisma.Decimal('40.00') });
    mocks.invoiceFindUnique.mockResolvedValue({ ...invoice(), status: 'PAID', paidAmount: new Prisma.Decimal('100.00'), balanceDue: new Prisma.Decimal('0') });

    const result = await reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'x', userId: 'user-1' });

    expect(result.invoice.status).toBe('PARTIALLY_PAID');
    expect(result.invoice.paidAmount.equals(new Prisma.Decimal('60.00'))).toBe(true);
    expect(result.invoice.balanceDue.equals(new Prisma.Decimal('40.00'))).toBe(true);
  });

  it('prevents double reversal by rejecting a second reversal attempt', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ ...payment(), reversedAt: new Date() });

    await expect(reversePayment({ businessId: 'biz-1', paymentId: 'pay-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Payment has already been reversed');
    expect(mocks.reverseSourceJournal).not.toHaveBeenCalled();
  });
});