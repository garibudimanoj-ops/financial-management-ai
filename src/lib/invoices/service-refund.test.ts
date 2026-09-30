import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';

const mocks = vi.hoisted(() => ({
  reverseSourceJournal: vi.fn(),
  logAuditEvent: vi.fn(),
  recordLedgerEntry: vi.fn(),
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
  },
}));

import { refundInvoice } from './service';

let tx: any;

const invoice = (overrides: any = {}) => ({
  id: 'inv-1',
  businessId: 'biz-1',
  invoiceNumber: 'INV-00001',
  status: 'PARTIALLY_PAID',
  totalAmount: new Prisma.Decimal('100.00'),
  paidAmount: new Prisma.Decimal('40.00'),
  balanceDue: new Prisma.Decimal('60.00'),
  customerId: 'cust-1',
  items: [],
  payments: [
    {
      id: 'pay-1',
      amount: new Prisma.Decimal('40.00'),
      reference: 'payment-ref',
      reversedAt: null,
    },
    {
      id: 'pay-2',
      amount: new Prisma.Decimal('20.00'),
      reference: 'already-reversed',
      reversedAt: new Date(),
    },
  ],
  ...overrides,
});

describe('refundInvoice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.reverseSourceJournal.mockResolvedValue({ id: 'reversal-1' });
    mocks.logAuditEvent.mockResolvedValue(undefined);
    mocks.recordLedgerEntry.mockResolvedValue({});
    mocks.invoiceUpdate.mockImplementation(async (args: any) => ({
      ...invoice(),
      ...args.data,
    }));
    mocks.paymentUpdate.mockResolvedValue({});

    tx = {
      invoice: { findUnique: mocks.invoiceFindUnique, update: mocks.invoiceUpdate },
      payment: { update: mocks.paymentUpdate },
    };
  });

  it('reverses outstanding payment journals and balances invoice and payment ledger entries', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(invoice());

    const result = await refundInvoice({
      businessId: 'biz-1',
      invoiceId: 'inv-1',
      reason: 'customer refund',
      userId: 'user-1',
    });

    expect(result.status).toBe('REFUNDED');
    expect(mocks.reverseSourceJournal).toHaveBeenCalledTimes(2);
    expect(mocks.reverseSourceJournal).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        sourceType: 'INVOICE',
        sourceId: 'inv-1',
        reversalSourceType: 'INVOICE_REFUND',
      })
    );
    expect(mocks.reverseSourceJournal).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        sourceType: 'PAYMENT',
        sourceId: 'pay-1',
        reversalSourceType: 'PAYMENT_REVERSAL',
      })
    );
    expect(mocks.paymentUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-1' },
        data: expect.objectContaining({
          reversedById: 'user-1',
          reversalReason: 'customer refund',
        }),
      })
    );
    expect(mocks.recordLedgerEntry).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        entryType: 'DEBIT',
        paymentId: 'pay-1',
        amount: new Prisma.Decimal('40.00'),
      })
    );
    expect(mocks.recordLedgerEntry).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        entryType: 'REFUND',
        amount: new Prisma.Decimal('100.00'),
      })
    );
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVOICE_REFUND' })
    );
  });

  it('does not complete the refund when an active payment journal is missing', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(invoice());
    mocks.reverseSourceJournal
      .mockResolvedValueOnce({ id: 'invoice-reversal' })
      .mockResolvedValueOnce(null);

    await expect(
      refundInvoice({
        businessId: 'biz-1',
        invoiceId: 'inv-1',
        reason: 'customer refund',
        userId: 'user-1',
      })
    ).rejects.toThrow(AppError);

    expect(mocks.paymentUpdate).not.toHaveBeenCalled();
    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
  });
});
