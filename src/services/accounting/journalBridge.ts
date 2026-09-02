import { Prisma } from '@prisma/client';
import { getStandardAccountMap } from './accountService';

export interface SaleJournalInput {
  businessId: string;
  invoiceId: string;
  invoiceNumber: string;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  totalCostOfGoods: Prisma.Decimal;
  initialPaid: Prisma.Decimal;
  paymentMethod?: string;
  userId?: string | null;
  date?: Date;
}

export interface PaymentJournalInput {
  businessId: string;
  paymentId: string;
  invoiceNumber?: string;
  amount: Prisma.Decimal;
  paymentMethod: string;
  userId?: string | null;
  date?: Date;
}

/**
 * Automatically creates double-entry journal entries and updates account balances
 * when a sales invoice is issued or finalized.
 */
export async function recordSaleInvoiceJournal(
  tx: Prisma.TransactionClient,
  input: SaleJournalInput
) {
  const accountMap = await getStandardAccountMap(input.businessId, tx);

  const cashAcc = accountMap.get('1010');
  const bankAcc = accountMap.get('1020');
  const arAcc = accountMap.get('1100');
  const invAcc = accountMap.get('1200');
  const gstOutputAcc = accountMap.get('2020');
  const salesRevAcc = accountMap.get('4010');
  const cogsAcc = accountMap.get('5010');

  if (!salesRevAcc || !arAcc) {
    // If accounts could not be mapped, skip gracefully
    return null;
  }

  const date = input.date || new Date();
  const netSalesRevenue = input.subtotal.minus(input.discountAmount);
  const totalAmount = input.totalAmount;
  const initialPaid = input.initialPaid || new Prisma.Decimal(0);
  const receivableAmount = totalAmount.minus(initialPaid);

  const entries: Array<{
    accountId: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    description: string;
  }> = [];

  // 1. Debits: Cash / Bank / Accounts Receivable
  const paymentAcc = input.paymentMethod === 'CASH' ? (cashAcc || bankAcc || arAcc) : (bankAcc || cashAcc || arAcc);

  if (initialPaid.greaterThan(0)) {
    entries.push({
      accountId: paymentAcc.id,
      debit: initialPaid,
      credit: new Prisma.Decimal(0),
      description: `Payment received for Invoice #${input.invoiceNumber}`,
    });
  }

  if (receivableAmount.greaterThan(0)) {
    entries.push({
      accountId: arAcc.id,
      debit: receivableAmount,
      credit: new Prisma.Decimal(0),
      description: `Receivable recognized for Invoice #${input.invoiceNumber}`,
    });
  }

  // 2. Credits: Sales Revenue + GST Output Tax
  if (netSalesRevenue.greaterThan(0)) {
    entries.push({
      accountId: salesRevAcc.id,
      debit: new Prisma.Decimal(0),
      credit: netSalesRevenue,
      description: `Sales revenue from Invoice #${input.invoiceNumber}`,
    });
  }

  if (input.taxAmount.greaterThan(0) && gstOutputAcc) {
    entries.push({
      accountId: gstOutputAcc.id,
      debit: new Prisma.Decimal(0),
      credit: input.taxAmount,
      description: `GST Output Tax collected on Invoice #${input.invoiceNumber}`,
    });
  }

  // 3. Cost of Goods Sold (COGS) & Inventory Asset Deduction (if applicable)
  if (input.totalCostOfGoods.greaterThan(0) && cogsAcc && invAcc) {
    entries.push({
      accountId: cogsAcc.id,
      debit: input.totalCostOfGoods,
      credit: new Prisma.Decimal(0),
      description: `Cost of goods sold for Invoice #${input.invoiceNumber}`,
    });

    entries.push({
      accountId: invAcc.id,
      debit: new Prisma.Decimal(0),
      credit: input.totalCostOfGoods,
      description: `Inventory stock reduction for Invoice #${input.invoiceNumber}`,
    });
  }

  // Validate balance
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);
  for (const e of entries) {
    totalDebit = totalDebit.plus(e.debit);
    totalCredit = totalCredit.plus(e.credit);
  }

  if (!totalDebit.equals(totalCredit)) {
    console.warn(`[JournalBridge] Imbalance detected: Debits ${totalDebit.toString()} != Credits ${totalCredit.toString()}`);
    return null;
  }

  const count = await tx.transaction.count({ where: { businessId: input.businessId } });
  const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '');
  const transactionNumber = `TXN-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

  const transaction = await tx.transaction.create({
    data: {
      businessId: input.businessId,
      transactionNumber,
      date,
      description: `Sales Invoice #${input.invoiceNumber}`,
      reference: input.invoiceNumber,
      status: 'POSTED',
      requiresHumanReview: false,
      verifiedStatus: 'VERIFIED',
      createdById: input.userId || null,
      entries: {
        create: entries.map((e) => ({
          accountId: e.accountId,
          debit: e.debit,
          credit: e.credit,
          description: e.description,
        })),
      },
    },
  });

  // Update account balances
  for (const e of entries) {
    const acc = Array.from(accountMap.values()).find((a) => a.id === e.accountId);
    if (acc) {
      let delta = new Prisma.Decimal(0);
      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        delta = e.debit.minus(e.credit);
      } else {
        delta = e.credit.minus(e.debit);
      }
      await tx.account.update({
        where: { id: acc.id },
        data: { balance: acc.balance.plus(delta) },
      });
    }
  }

  return transaction;
}

/**
 * Automatically creates double-entry journal entries and updates account balances
 * when a customer payment is received against an invoice or outstanding balance.
 */
export async function recordPaymentJournal(
  tx: Prisma.TransactionClient,
  input: PaymentJournalInput
) {
  const accountMap = await getStandardAccountMap(input.businessId, tx);

  const cashAcc = accountMap.get('1010');
  const bankAcc = accountMap.get('1020');
  const arAcc = accountMap.get('1100');

  if (!arAcc) {
    return null;
  }

  const paymentAcc = input.paymentMethod === 'CASH' ? (cashAcc || bankAcc || arAcc) : (bankAcc || cashAcc || arAcc);
  const date = input.date || new Date();
  const amount = input.amount;

  if (amount.lessThanOrEqualTo(0)) {
    return null;
  }

  const entries = [
    {
      accountId: paymentAcc.id,
      debit: amount,
      credit: new Prisma.Decimal(0),
      description: `Payment received (${input.paymentMethod}) ${input.invoiceNumber ? `for Invoice #${input.invoiceNumber}` : ''}`.trim(),
    },
    {
      accountId: arAcc.id,
      debit: new Prisma.Decimal(0),
      credit: amount,
      description: `Receivable reduction ${input.invoiceNumber ? `for Invoice #${input.invoiceNumber}` : ''}`.trim(),
    },
  ];

  const count = await tx.transaction.count({ where: { businessId: input.businessId } });
  const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '');
  const transactionNumber = `TXN-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

  const transaction = await tx.transaction.create({
    data: {
      businessId: input.businessId,
      transactionNumber,
      date,
      description: `Customer Payment Received ${input.invoiceNumber ? `(Invoice #${input.invoiceNumber})` : ''}`.trim(),
      reference: input.invoiceNumber || input.paymentId,
      status: 'POSTED',
      requiresHumanReview: false,
      verifiedStatus: 'VERIFIED',
      createdById: input.userId || null,
      entries: {
        create: entries.map((e) => ({
          accountId: e.accountId,
          debit: e.debit,
          credit: e.credit,
          description: e.description,
        })),
      },
    },
  });

  // Update account balances
  for (const e of entries) {
    const acc = Array.from(accountMap.values()).find((a) => a.id === e.accountId);
    if (acc) {
      let delta = new Prisma.Decimal(0);
      if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
        delta = e.debit.minus(e.credit);
      } else {
        delta = e.credit.minus(e.debit);
      }
      await tx.account.update({
        where: { id: acc.id },
        data: { balance: acc.balance.plus(delta) },
      });
    }
  }

  return transaction;
}
