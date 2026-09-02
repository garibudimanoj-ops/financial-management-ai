import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordSaleInvoiceJournal, recordPaymentJournal } from './journalBridge';
import * as accountService from './accountService';
import { Prisma } from '@prisma/client';

describe('Accounting Journal Bridge', () => {
  let mockTx: any;

  beforeEach(() => {
    vi.spyOn(accountService, 'getStandardAccountMap').mockResolvedValue(
      new Map([
        ['1010', { id: 'acc-cash', code: '1010', name: 'Cash on Hand', type: 'ASSET', balance: new Prisma.Decimal(0) }],
        ['1020', { id: 'acc-bank', code: '1020', name: 'Bank Current Account', type: 'ASSET', balance: new Prisma.Decimal(0) }],
        ['1100', { id: 'acc-ar', code: '1100', name: 'Accounts Receivable', type: 'ASSET', balance: new Prisma.Decimal(0) }],
        ['1200', { id: 'acc-inv', code: '1200', name: 'Inventory Asset', type: 'ASSET', balance: new Prisma.Decimal(10000) }],
        ['2020', { id: 'acc-gst', code: '2020', name: 'GST Output Tax', type: 'LIABILITY', balance: new Prisma.Decimal(0) }],
        ['4010', { id: 'acc-sales', code: '4010', name: 'Sales Revenue', type: 'REVENUE', balance: new Prisma.Decimal(0) }],
        ['5010', { id: 'acc-cogs', code: '5010', name: 'Cost of Goods Sold', type: 'EXPENSE', balance: new Prisma.Decimal(0) }],
      ])
    );

    mockTx = {
      transaction: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(async (args) => ({
          id: 'txn-123',
          ...args.data,
        })),
      },
      account: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
  });

  it('should post balanced double-entry transaction for credit sale with GST and COGS', async () => {
    const result = await recordSaleInvoiceJournal(mockTx, {
      businessId: 'biz-1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-00001',
      subtotal: new Prisma.Decimal(1000),
      discountAmount: new Prisma.Decimal(100), // Net revenue = 900
      taxAmount: new Prisma.Decimal(162), // 18% GST on 900 = 162
      totalAmount: new Prisma.Decimal(1062),
      totalCostOfGoods: new Prisma.Decimal(500),
      initialPaid: new Prisma.Decimal(0), // Full credit
      userId: 'user-1',
    });

    expect(result).not.toBeNull();
    expect(mockTx.transaction.create).toHaveBeenCalledTimes(1);

    const callArgs = mockTx.transaction.create.mock.calls[0][0];
    const entries = callArgs.data.entries.create;

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const e of entries) {
      totalDebit = totalDebit.plus(e.debit);
      totalCredit = totalCredit.plus(e.credit);
    }

    // Strict Accounting Invariant: Sum(Debits) === Sum(Credits)
    expect(totalDebit.toString()).toBe(totalCredit.toString());
    // Total Debits = 1062 (AR) + 500 (COGS) = 1562
    expect(totalDebit.toString()).toBe('1562');
    // Total Credits = 900 (Sales) + 162 (GST) + 500 (Inventory reduction) = 1562
    expect(totalCredit.toString()).toBe('1562');
  });

  it('should post balanced double-entry transaction for immediate cash sale', async () => {
    const result = await recordSaleInvoiceJournal(mockTx, {
      businessId: 'biz-1',
      invoiceId: 'inv-2',
      invoiceNumber: 'INV-00002',
      subtotal: new Prisma.Decimal(500),
      discountAmount: new Prisma.Decimal(0),
      taxAmount: new Prisma.Decimal(90),
      totalAmount: new Prisma.Decimal(590),
      totalCostOfGoods: new Prisma.Decimal(250),
      initialPaid: new Prisma.Decimal(590), // Paid in full
      paymentMethod: 'CASH',
      userId: 'user-1',
    });

    expect(result).not.toBeNull();
    const callArgs = mockTx.transaction.create.mock.calls[0][0];
    const entries = callArgs.data.entries.create;

    const cashEntry = entries.find((e: any) => e.accountId === 'acc-cash');
    expect(cashEntry).toBeDefined();
    expect(cashEntry.debit.toString()).toBe('590');
  });

  it('should post balanced transaction for customer invoice payment', async () => {
    const result = await recordPaymentJournal(mockTx, {
      businessId: 'biz-1',
      paymentId: 'pay-1',
      invoiceNumber: 'INV-00001',
      amount: new Prisma.Decimal(1062),
      paymentMethod: 'BANK_TRANSFER',
      userId: 'user-1',
    });

    expect(result).not.toBeNull();
    const callArgs = mockTx.transaction.create.mock.calls[0][0];
    const entries = callArgs.data.entries.create;

    expect(entries).toHaveLength(2);
    // Debit Bank, Credit AR
    expect(entries[0].accountId).toBe('acc-bank');
    expect(entries[0].debit.toString()).toBe('1062');
    expect(entries[1].accountId).toBe('acc-ar');
    expect(entries[1].credit.toString()).toBe('1062');
  });
});
