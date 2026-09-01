import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/errors';
import { CreateTransactionDTO, TransactionDTO } from '@/types/accounting';

function toDecimal(val: string | number | Prisma.Decimal): Prisma.Decimal {
  if (val instanceof Prisma.Decimal) return val;
  try {
    return new Prisma.Decimal(val.toString());
  } catch {
    throw new AppError(`Invalid numeric value: ${val}`, 'VALIDATION_ERROR', 400);
  }
}

/**
 * Creates a double-entry transaction atomically.
 * Strictly enforces that sum(debits) === sum(credits).
 */
export async function createTransaction(input: CreateTransactionDTO): Promise<TransactionDTO> {
  const businessId = input.businessId || input.companyId;
  if (!businessId) {
    throw new AppError('Business ID (or companyId) is required', 'VALIDATION_ERROR', 400);
  }

  if (!input.description || input.description.trim() === '') {
    throw new AppError('Transaction description is required', 'VALIDATION_ERROR', 400);
  }

  if (!input.entries || !Array.isArray(input.entries) || input.entries.length < 2) {
    throw new AppError('Transaction must contain at least two entries', 'VALIDATION_ERROR', 400);
  }

  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  const parsedEntries = input.entries.map((e, index) => {
    if (!e.accountId) {
      throw new AppError(`Entry at index ${index} is missing accountId`, 'VALIDATION_ERROR', 400);
    }

    const debit = toDecimal(e.debit ?? 0);
    const credit = toDecimal(e.credit ?? 0);

    if (debit.isNegative() || credit.isNegative()) {
      throw new AppError(`Entry amounts cannot be negative at index ${index}`, 'VALIDATION_ERROR', 400);
    }

    if (debit.isZero() && credit.isZero()) {
      throw new AppError(`Entry must have either debit or credit greater than 0 at index ${index}`, 'VALIDATION_ERROR', 400);
    }

    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);

    return {
      accountId: e.accountId,
      debit,
      credit,
      description: e.description,
    };
  });

  // Strict double-entry balance validation
  if (!totalDebit.equals(totalCredit)) {
    throw new AppError('Debits and credits must balance', 'VALIDATION_ERROR', 400);
  }

  if (totalDebit.isZero()) {
    throw new AppError('Transaction total cannot be zero', 'VALIDATION_ERROR', 400);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify all accounts exist and belong to the business
    const accountIds = Array.from(new Set(parsedEntries.map((e) => e.accountId)));
    const accounts = await tx.account.findMany({
      where: {
        id: { in: accountIds },
        businessId,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new AppError('One or more specified accounts do not exist or belong to another organization', 'VALIDATION_ERROR', 400);
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // 2. Generate unique transaction number
    const count = await tx.transaction.count({ where: { businessId } });
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const transactionNumber = `TXN-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

    const status = input.status || 'POSTED';

    // 3. Create Transaction header
    const createdTxn = await tx.transaction.create({
      data: {
        businessId,
        transactionNumber,
        date: input.date ? new Date(input.date) : new Date(),
        description: input.description.trim(),
        reference: input.reference || null,
        status,
        requiresHumanReview: input.requiresHumanReview ?? false,
        verifiedStatus: input.verifiedStatus || 'VERIFIED',
        createdById: input.userId || null,
        entries: {
          create: parsedEntries.map((e) => ({
            accountId: e.accountId,
            debit: e.debit,
            credit: e.credit,
            description: e.description || null,
          })),
        },
      },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
    });

    // 4. Update account balances if POSTED
    if (status === 'POSTED') {
      for (const entry of parsedEntries) {
        const acc = accountMap.get(entry.accountId)!;
        let balanceDelta = new Prisma.Decimal(0);

        // Assets and Expenses increase on Debit, decrease on Credit
        if (acc.type === 'ASSET' || acc.type === 'EXPENSE') {
          balanceDelta = entry.debit.minus(entry.credit);
        } else {
          // Liabilities, Equity, Revenue increase on Credit, decrease on Debit
          balanceDelta = entry.credit.minus(entry.debit);
        }

        await tx.account.update({
          where: { id: acc.id },
          data: {
            balance: acc.balance.plus(balanceDelta),
          },
        });
      }
    }

    return {
      id: createdTxn.id,
      businessId: createdTxn.businessId,
      transactionNumber: createdTxn.transactionNumber,
      date: createdTxn.date,
      description: createdTxn.description,
      reference: createdTxn.reference,
      status: createdTxn.status as any,
      requiresHumanReview: createdTxn.requiresHumanReview,
      verifiedStatus: createdTxn.verifiedStatus,
      totalAmount: totalDebit.toString(),
      entries: createdTxn.entries.map((e) => ({
        id: e.id,
        transactionId: e.transactionId,
        accountId: e.accountId,
        account: e.account ? {
          id: e.account.id,
          businessId: e.account.businessId,
          code: e.account.code,
          name: e.account.name,
          type: e.account.type as any,
          category: e.account.category,
          currency: e.account.currency,
          balance: e.account.balance.toString(),
          isActive: e.account.isActive,
          description: e.account.description,
          createdAt: e.account.createdAt,
          updatedAt: e.account.updatedAt,
        } : undefined,
        debit: e.debit.toString(),
        credit: e.credit.toString(),
        description: e.description,
      })),
      createdAt: createdTxn.createdAt,
      updatedAt: createdTxn.updatedAt,
    };
  });
}

/**
 * Fetches a single transaction by ID and validates business ownership.
 */
export async function getTransactionById(businessId: string, transactionId: string): Promise<TransactionDTO> {
  const txn = await prisma.transaction.findFirst({
    where: { id: transactionId, businessId },
    include: {
      entries: {
        include: {
          account: true,
        },
      },
    },
  });

  if (!txn) {
    throw new AppError('Transaction not found', 'NOT_FOUND', 404);
  }

  const totalDebit = txn.entries.reduce((acc, curr) => acc.plus(curr.debit), new Prisma.Decimal(0));

  return {
    id: txn.id,
    businessId: txn.businessId,
    transactionNumber: txn.transactionNumber,
    date: txn.date,
    description: txn.description,
    reference: txn.reference,
    status: txn.status as any,
    requiresHumanReview: txn.requiresHumanReview,
    verifiedStatus: txn.verifiedStatus,
    totalAmount: totalDebit.toString(),
    entries: txn.entries.map((e) => ({
      id: e.id,
      transactionId: e.transactionId,
      accountId: e.accountId,
      account: e.account ? {
        id: e.account.id,
        businessId: e.account.businessId,
        code: e.account.code,
        name: e.account.name,
        type: e.account.type as any,
        category: e.account.category,
        currency: e.account.currency,
        balance: e.account.balance.toString(),
        isActive: e.account.isActive,
        description: e.account.description,
        createdAt: e.account.createdAt,
        updatedAt: e.account.updatedAt,
      } : undefined,
      debit: e.debit.toString(),
      credit: e.credit.toString(),
      description: e.description,
    })),
    createdAt: txn.createdAt,
    updatedAt: txn.updatedAt,
  };
}

/**
 * Lists transactions with pagination and optional status filter.
 */
export async function listTransactions(
  businessId: string,
  options: { limit?: number; offset?: number; status?: string } = {}
) {
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  const where: Prisma.TransactionWhereInput = {
    businessId,
    ...(options.status ? { status: options.status as any } : {}),
  };

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      include: {
        entries: {
          include: {
            account: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    transactions: transactions.map((txn) => {
      const totalDebit = txn.entries.reduce((acc, curr) => acc.plus(curr.debit), new Prisma.Decimal(0));
      return {
        id: txn.id,
        businessId: txn.businessId,
        transactionNumber: txn.transactionNumber,
        date: txn.date,
        description: txn.description,
        reference: txn.reference,
        status: txn.status as any,
        requiresHumanReview: txn.requiresHumanReview,
        verifiedStatus: txn.verifiedStatus,
        totalAmount: totalDebit.toString(),
        entries: txn.entries.map((e) => ({
          id: e.id,
          transactionId: e.transactionId,
          accountId: e.accountId,
          accountName: e.account?.name,
          accountCode: e.account?.code,
          debit: e.debit.toString(),
          credit: e.credit.toString(),
          description: e.description,
        })),
        createdAt: txn.createdAt,
        updatedAt: txn.updatedAt,
      };
    }),
  };
}
