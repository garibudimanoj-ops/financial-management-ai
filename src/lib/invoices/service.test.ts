import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';

const mocks = vi.hoisted(() => ({
  reverseSourceJournal: vi.fn(),
  logAuditEvent: vi.fn(),
  recordLedgerEntry: vi.fn(),
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  invoiceFindUnique: vi.fn(),
  invoiceUpdate: vi.fn(),
  transactionFindFirst: vi.fn(),
  inventoryMovementCreate: vi.fn(),
}));

vi.mock('@/services/accounting/journalBridge', () => ({
  reverseSourceJournal: mocks.reverseSourceJournal,
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: mocks.logAuditEvent }));
vi.mock('@/lib/customers/service', () => ({ recordLedgerEntry: mocks.recordLedgerEntry }));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(tx),
    product: { findUnique: mocks.productFindUnique, update: mocks.productUpdate },
    invoice: { findUnique: mocks.invoiceFindUnique, update: mocks.invoiceUpdate },
    transaction: { findFirst: mocks.transactionFindFirst },
    inventoryMovement: { create: mocks.inventoryMovementCreate },
  },
}));

import { cancelInvoice } from './service';

let tx: any;

const baseInvoice = (overrides: any = {}) => ({
  id: 'inv-1',
  businessId: 'biz-1',
  invoiceNumber: 'INV-00001',
  status: 'ISSUED',
  totalAmount: new Prisma.Decimal('100.00'),
  paidAmount: new Prisma.Decimal('0'),
  balanceDue: new Prisma.Decimal('100.00'),
  customerId: null,
  items: [{ id: 'item-1', productId: 'prod-1', productNameSnapshot: 'Widget', quantity: new Prisma.Decimal('2') }],
  ...overrides,
});

describe('cancelInvoice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.reverseSourceJournal.mockResolvedValue({ id: 'rev-1' });
    mocks.logAuditEvent.mockResolvedValue(undefined);
    mocks.recordLedgerEntry.mockResolvedValue({});
    mocks.productUpdate.mockResolvedValue({});
    mocks.invoiceUpdate.mockImplementation(async (args: any) => ({ id: 'inv-1', ...args.data }));

    tx = {
      product: { findUnique: mocks.productFindUnique, update: mocks.productUpdate },
      invoice: { findUnique: mocks.invoiceFindUnique, update: mocks.invoiceUpdate },
      transaction: { findFirst: mocks.transactionFindFirst },
      inventoryMovement: { create: mocks.inventoryMovementCreate },
    };
  });

  it('rejects an empty cancellation reason', async () => {
    await expect(cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: '   ', userId: 'user-1' }))
      .rejects.toThrow(AppError);
    expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invoice belonging to another tenant', async () => {
    mocks.invoiceFindUnique.mockResolvedValue({ ...baseInvoice(), businessId: 'biz-other' });

    await expect(cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Invoice not found in this business');
    expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
  });

  it('rejects a paid invoice and does not alter paidAmount', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(baseInvoice({ status: 'PAID' }));

    await expect(cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Cannot cancel invoice with status PAID');
    expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
    expect(mocks.reverseSourceJournal).not.toHaveBeenCalled();
  });

  it('rejects a partially paid invoice', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(baseInvoice({ status: 'PARTIALLY_PAID' }));

    await expect(cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Cannot cancel invoice with status PARTIALLY_PAID');
  });

  it('rejects an already cancelled invoice', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(baseInvoice({ status: 'CANCELLED' }));

    await expect(cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Invoice is already cancelled');
  });

  it('rejects a refunded invoice', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(baseInvoice({ status: 'REFUNDED' }));

    await expect(cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Cannot cancel a refunded invoice');
  });

  it('voids a DRAFT invoice without touching inventory, ledger, or journals', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(baseInvoice({ status: 'DRAFT' }));

    const result = await cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'duplicate', userId: 'user-1' });

    expect(result.status).toBe('CANCELLED');
    expect(mocks.productFindUnique).not.toHaveBeenCalled();
    expect(mocks.inventoryMovementCreate).not.toHaveBeenCalled();
    expect(mocks.transactionFindFirst).not.toHaveBeenCalled();
    expect(mocks.reverseSourceJournal).not.toHaveBeenCalled();
    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'INVOICE_CANCEL' }));
  });

  it('restores inventory, reverses the sale journal, and offsets the receivable for an unpaid issued invoice', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(baseInvoice({ status: 'ISSUED', customerId: 'cust-1' }));
    mocks.productFindUnique.mockResolvedValue({
      id: 'prod-1',
      businessId: 'biz-1',
      stockQuantity: new Prisma.Decimal('10.0000'),
      costPrice: new Prisma.Decimal('5.00'),
    });

    const result = await cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'customer cancelled', userId: 'user-1' });

    expect(result.status).toBe('CANCELLED');
    expect(mocks.inventoryMovementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: 'RETURN',
          quantity: new Prisma.Decimal('2'),
          previousStock: new Prisma.Decimal('10.0000'),
          resultingStock: new Prisma.Decimal('12.0000'),
          reason: expect.stringContaining('INV-00001'),
        }),
      })
    );
    expect(mocks.reverseSourceJournal).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ sourceType: 'INVOICE', sourceId: 'inv-1', reversalSourceType: 'INVOICE_CANCELLATION' })
    );
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ entryType: 'CREDIT', amount: new Prisma.Decimal('100.00') })
    );
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'INVOICE_CANCEL' }));
  });

  it('fails safely when the posted sale journal cannot be found', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(baseInvoice({ status: 'ISSUED' }));
    mocks.productFindUnique.mockResolvedValue({
      id: 'prod-1',
      businessId: 'biz-1',
      stockQuantity: new Prisma.Decimal('10.0000'),
      costPrice: new Prisma.Decimal('5.00'),
    });
    mocks.transactionFindFirst.mockResolvedValue(null);
    mocks.reverseSourceJournal.mockResolvedValue(null);

    await expect(cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Posted sale journal for this invoice was not found');
  });

  it('prevents double reversal by rejecting a second cancellation', async () => {
    mocks.invoiceFindUnique.mockResolvedValue(baseInvoice({ status: 'CANCELLED' }));

    await expect(cancelInvoice({ businessId: 'biz-1', invoiceId: 'inv-1', reason: 'x', userId: 'user-1' }))
      .rejects.toThrow('Invoice is already cancelled');
    expect(mocks.reverseSourceJournal).not.toHaveBeenCalled();
  });
});