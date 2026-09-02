import { Prisma } from '@prisma/client';
import { getStandardAccountMap } from './accountService';
import { AppError } from '@/lib/errors';

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

export interface PurchaseJournalInput {
  businessId: string;
  billId: string;
  billNumber: string;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  supplierName: string;
  userId?: string | null;
  date?: Date;
}

export interface SupplierPaymentJournalInput {
  businessId: string;
  paymentId: string;
  billNumber?: string;
  supplierName: string;
  amount: Prisma.Decimal;
  paymentMethod: string;
  userId?: string | null;
  date?: Date;
}

export interface ExpenseJournalInput {
  businessId: string;
  expenseId: string;
  expenseNumber: string;
  accountId: string;
  payeeName: string;
  amount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
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

  if (!salesRevAcc || !arAcc) throw new AppError('Required sales ledger accounts are unavailable', 'VALIDATION_ERROR');

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

  // 3. Cost of Goods Sold (COGS) & Inventory Asset Deduction
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
 * when a customer payment is received against an invoice.
 */
export async function recordPaymentJournal(
  tx: Prisma.TransactionClient,
  input: PaymentJournalInput
) {
  const accountMap = await getStandardAccountMap(input.businessId, tx);

  const cashAcc = accountMap.get('1010');
  const bankAcc = accountMap.get('1020');
  const arAcc = accountMap.get('1100');

  if (!arAcc) throw new AppError('Accounts Receivable ledger account is unavailable', 'VALIDATION_ERROR');

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

/**
 * Automatically creates double-entry journal entries and updates account balances
 * when a purchase bill is received and posted.
 * Invariant: Debit Inventory Asset (1200) + Debit GST ITC (1300) = Credit Accounts Payable (2010).
 */
export async function recordPurchaseBillJournal(
  tx: Prisma.TransactionClient,
  input: PurchaseJournalInput
) {
  const accountMap = await getStandardAccountMap(input.businessId, tx);

  const invAcc = accountMap.get('1200');
  const gstItcAcc = accountMap.get('1300');
  const apAcc = accountMap.get('2010');

  if (!invAcc || !apAcc || (input.taxAmount.greaterThan(0) && !gstItcAcc)) throw new AppError('Required purchase ledger accounts are unavailable', 'VALIDATION_ERROR');

  const date = input.date || new Date();
  const netInventoryCost = input.subtotal.minus(input.discountAmount);
  const totalAmount = input.totalAmount;

  const entries: Array<{
    accountId: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    description: string;
  }> = [];

  // 1. Debits: Inventory Asset + GST ITC
  if (netInventoryCost.greaterThan(0)) {
    entries.push({
      accountId: invAcc.id,
      debit: netInventoryCost,
      credit: new Prisma.Decimal(0),
      description: `Inventory purchase from ${input.supplierName} (Bill #${input.billNumber})`,
    });
  }

  if (input.taxAmount.greaterThan(0) && gstItcAcc) {
    entries.push({
      accountId: gstItcAcc.id,
      debit: input.taxAmount,
      credit: new Prisma.Decimal(0),
      description: `Input Tax Credit on Purchase Bill #${input.billNumber}`,
    });
  }

  // 2. Credits: Accounts Payable (Creditors)
  if (totalAmount.greaterThan(0)) {
    entries.push({
      accountId: apAcc.id,
      debit: new Prisma.Decimal(0),
      credit: totalAmount,
      description: `Accounts payable recognized to ${input.supplierName} (Bill #${input.billNumber})`,
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
    throw new AppError(`Purchase journal is unbalanced: debits ${totalDebit.toString()} do not equal credits ${totalCredit.toString()}`, 'VALIDATION_ERROR');
  }

  const count = await tx.transaction.count({ where: { businessId: input.businessId } });
  const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '');
  const transactionNumber = `TXN-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

  const transaction = await tx.transaction.create({
    data: {
      businessId: input.businessId,
      transactionNumber,
      date,
      description: `Purchase Bill #${input.billNumber} (${input.supplierName})`,
      reference: input.billNumber,
      sourceType: 'PURCHASE_BILL',
      sourceId: input.billId,
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
 * when a payment is made to a supplier.
 * Invariant: Debit Accounts Payable (2010) = Credit Cash (1010) / Bank (1020).
 */
export async function recordSupplierPaymentJournal(
  tx: Prisma.TransactionClient,
  input: SupplierPaymentJournalInput
) {
  const accountMap = await getStandardAccountMap(input.businessId, tx);

  const cashAcc = accountMap.get('1010');
  const bankAcc = accountMap.get('1020');
  const apAcc = accountMap.get('2010');

  if (!apAcc || (!cashAcc && !bankAcc)) throw new AppError('Required supplier-payment ledger accounts are unavailable', 'VALIDATION_ERROR');

  const paymentAcc = input.paymentMethod === 'CASH' ? (cashAcc || bankAcc || apAcc) : (bankAcc || cashAcc || apAcc);
  const date = input.date || new Date();
  const amount = input.amount;

  if (amount.lessThanOrEqualTo(0)) throw new AppError('Supplier payment must be positive', 'VALIDATION_ERROR');

  const entries = [
    {
      accountId: apAcc.id,
      debit: amount,
      credit: new Prisma.Decimal(0),
      description: `Payable reduction for ${input.supplierName} ${input.billNumber ? `(Bill #${input.billNumber})` : ''}`.trim(),
    },
    {
      accountId: paymentAcc.id,
      debit: new Prisma.Decimal(0),
      credit: amount,
      description: `Supplier payment (${input.paymentMethod}) to ${input.supplierName}`.trim(),
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
      description: `Supplier Payment to ${input.supplierName}`,
      reference: input.billNumber || input.paymentId,
      sourceType: 'SUPPLIER_PAYMENT',
      sourceId: input.paymentId,
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
 * when a business overhead expense is recorded.
 * Invariant: Debit Expense Account + Debit GST ITC = Credit Cash / Bank / AP.
 */
export async function recordExpenseJournal(
  tx: Prisma.TransactionClient,
  input: ExpenseJournalInput
) {
  const accountMap = await getStandardAccountMap(input.businessId, tx);

  const cashAcc = accountMap.get('1010');
  const bankAcc = accountMap.get('1020');
  const gstItcAcc = accountMap.get('1300');
  const apAcc = accountMap.get('2010');

  const paymentAcc = input.paymentMethod === 'CASH'
    ? (cashAcc || bankAcc || apAcc)
    : (bankAcc || cashAcc || apAcc);

  const date = input.date || new Date();
  const baseExpenseAmount = input.amount;
  const totalAmount = input.totalAmount;

  const entries: Array<{
    accountId: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    description: string;
  }> = [];

  // 1. Debit Expense Account
  entries.push({
    accountId: input.accountId,
    debit: baseExpenseAmount,
    credit: new Prisma.Decimal(0),
    description: `Expense #${input.expenseNumber} paid to ${input.payeeName}`,
  });

  // 2. Debit GST ITC (if applicable)
  if (input.taxAmount.greaterThan(0) && gstItcAcc) {
    entries.push({
      accountId: gstItcAcc.id,
      debit: input.taxAmount,
      credit: new Prisma.Decimal(0),
      description: `GST ITC on Expense #${input.expenseNumber}`,
    });
  }

  // 3. Credit Payment / Bank / Cash Account
  if (paymentAcc && totalAmount.greaterThan(0)) {
    entries.push({
      accountId: paymentAcc.id,
      debit: new Prisma.Decimal(0),
      credit: totalAmount,
      description: `Payment for Expense #${input.expenseNumber} (${input.paymentMethod})`,
    });
  }

  // Validate balance
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);
  for (const e of entries) {
    totalDebit = totalDebit.plus(e.debit);
    totalCredit = totalCredit.plus(e.credit);
  }

  if (!totalDebit.equals(totalCredit)) throw new AppError(`Expense journal is unbalanced: debits ${totalDebit.toString()} do not equal credits ${totalCredit.toString()}`, 'VALIDATION_ERROR');

  const count = await tx.transaction.count({ where: { businessId: input.businessId } });
  const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '');
  const transactionNumber = `TXN-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

  const transaction = await tx.transaction.create({
    data: {
      businessId: input.businessId,
      transactionNumber,
      date,
      description: `Expense #${input.expenseNumber} (${input.payeeName})`,
      reference: input.expenseNumber,
      sourceType: 'EXPENSE',
      sourceId: input.expenseId,
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

/** Creates an immutable equal-and-opposite journal transaction for a posted source record. */
export async function reverseSourceJournal(
  tx: Prisma.TransactionClient,
  input: { businessId: string; sourceType: string; sourceId: string; reversalSourceType: string; reference: string; description: string; userId?: string | null; date?: Date }
) {
  const original = await tx.transaction.findFirst({
    where: { businessId: input.businessId, sourceType: input.sourceType, sourceId: input.sourceId, status: 'POSTED' },
    include: { entries: true },
  });
  if (!original) throw new AppError(`Posted journal for ${input.sourceType} was not found`, 'NOT_FOUND');
  const date = input.date || new Date();
  const reversal = await tx.transaction.create({
    data: {
      businessId: input.businessId,
      transactionNumber: `REV-${date.toISOString().slice(0, 10).replace(/-/g, '')}-${original.id.slice(-8)}`,
      date,
      description: input.description,
      reference: input.reference,
      sourceType: input.reversalSourceType,
      sourceId: input.sourceId,
      reversalOfId: original.id,
      status: 'POSTED',
      requiresHumanReview: false,
      verifiedStatus: 'VERIFIED',
      createdById: input.userId || null,
      entries: { create: original.entries.map((entry) => ({ accountId: entry.accountId, debit: entry.credit, credit: entry.debit, description: `Reversal: ${entry.description || original.description}` })) },
    },
  });
  for (const entry of original.entries) {
    const account = await tx.account.findUnique({ where: { id: entry.accountId } });
    if (!account) throw new AppError('Journal account no longer exists', 'NOT_FOUND');
    const delta = account.type === 'ASSET' || account.type === 'EXPENSE'
      ? entry.credit.minus(entry.debit)
      : entry.debit.minus(entry.credit);
    await tx.account.update({ where: { id: account.id }, data: { balance: account.balance.plus(delta) } });
  }
  return reversal;
}
