import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  TrialBalanceReportDTO,
  ProfitLossReportDTO,
  BalanceSheetReportDTO,
} from '@/types/accounting';

/**
 * Generates the Trial Balance report.
 * Debits and credits are aggregated per account and must balance (net to zero).
 */
export async function getTrialBalance(businessId: string): Promise<TrialBalanceReportDTO> {
  const accounts = await prisma.account.findMany({
    where: { businessId, isActive: true },
    include: {
      entries: {
        where: {
          transaction: {
            status: 'POSTED',
          },
        },
        select: {
          debit: true,
          credit: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  let grandTotalDebit = new Prisma.Decimal(0);
  let grandTotalCredit = new Prisma.Decimal(0);

  const items = accounts.map((acc) => {
    let accDebit = new Prisma.Decimal(0);
    let accCredit = new Prisma.Decimal(0);

    for (const entry of acc.entries) {
      accDebit = accDebit.plus(entry.debit);
      accCredit = accCredit.plus(entry.credit);
    }

    grandTotalDebit = grandTotalDebit.plus(accDebit);
    grandTotalCredit = grandTotalCredit.plus(accCredit);

    // Calculate Net Balances
    let netDebit = new Prisma.Decimal(0);
    let netCredit = new Prisma.Decimal(0);

    if (accDebit.greaterThan(accCredit)) {
      netDebit = accDebit.minus(accCredit);
    } else {
      netCredit = accCredit.minus(accDebit);
    }

    return {
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      accountType: acc.type as any,
      totalDebit: accDebit.toString(),
      totalCredit: accCredit.toString(),
      netDebit: netDebit.toString(),
      netCredit: netCredit.toString(),
    };
  });

  const isBalanced = grandTotalDebit.equals(grandTotalCredit);

  return {
    businessId,
    generatedAt: new Date().toISOString(),
    items,
    totalDebits: grandTotalDebit.toString(),
    totalCredits: grandTotalCredit.toString(),
    isBalanced,
  };
}

/**
 * Generates the Profit & Loss Statement (Income Statement) for a date range.
 */
export async function getProfitAndLoss(
  businessId: string,
  startDate?: string | Date,
  endDate?: string | Date
): Promise<ProfitLossReportDTO> {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const accounts = await prisma.account.findMany({
    where: {
      businessId,
      isActive: true,
      type: { in: ['REVENUE', 'EXPENSE'] },
    },
    include: {
      entries: {
        where: {
          transaction: {
            status: 'POSTED',
            ...(startDate || endDate ? { date: dateFilter } : {}),
          },
        },
        select: {
          debit: true,
          credit: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  let totalRevenue = new Prisma.Decimal(0);
  let totalExpenses = new Prisma.Decimal(0);

  const revenueItems: Array<{ accountId: string; accountCode: string; accountName: string; amount: string }> = [];
  const expenseItems: Array<{ accountId: string; accountCode: string; accountName: string; amount: string }> = [];

  for (const acc of accounts) {
    let accDebit = new Prisma.Decimal(0);
    let accCredit = new Prisma.Decimal(0);

    for (const e of acc.entries) {
      accDebit = accDebit.plus(e.debit);
      accCredit = accCredit.plus(e.credit);
    }

    if (acc.type === 'REVENUE') {
      const netRevenue = accCredit.minus(accDebit);
      totalRevenue = totalRevenue.plus(netRevenue);
      revenueItems.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: netRevenue.toString(),
      });
    } else if (acc.type === 'EXPENSE') {
      const netExpense = accDebit.minus(accCredit);
      totalExpenses = totalExpenses.plus(netExpense);
      expenseItems.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: netExpense.toString(),
      });
    }
  }

  const netProfitOrLoss = totalRevenue.minus(totalExpenses);

  return {
    businessId,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
    generatedAt: new Date().toISOString(),
    revenue: {
      items: revenueItems,
      totalRevenue: totalRevenue.toString(),
    },
    expenses: {
      items: expenseItems,
      totalExpenses: totalExpenses.toString(),
    },
    netProfitOrLoss: netProfitOrLoss.toString(),
    isProfitable: netProfitOrLoss.greaterThanOrEqualTo(0),
  };
}

/**
 * Generates the Balance Sheet report as of a specific date.
 */
export async function getBalanceSheet(
  businessId: string,
  asOfDate?: string | Date
): Promise<BalanceSheetReportDTO> {
  const targetDate = asOfDate ? new Date(asOfDate) : new Date();

  const accounts = await prisma.account.findMany({
    where: {
      businessId,
      isActive: true,
      type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
    },
    include: {
      entries: {
        where: {
          transaction: {
            status: 'POSTED',
            date: { lte: targetDate },
          },
        },
        select: {
          debit: true,
          credit: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  let totalAssets = new Prisma.Decimal(0);
  let totalLiabilities = new Prisma.Decimal(0);
  let totalEquity = new Prisma.Decimal(0);

  const assetItems: Array<{ accountId: string; accountCode: string; accountName: string; balance: string }> = [];
  const liabilityItems: Array<{ accountId: string; accountCode: string; accountName: string; balance: string }> = [];
  const equityItems: Array<{ accountId: string; accountCode: string; accountName: string; balance: string }> = [];

  for (const acc of accounts) {
    let accDebit = new Prisma.Decimal(0);
    let accCredit = new Prisma.Decimal(0);

    for (const e of acc.entries) {
      accDebit = accDebit.plus(e.debit);
      accCredit = accCredit.plus(e.credit);
    }

    if (acc.type === 'ASSET') {
      const netAsset = accDebit.minus(accCredit);
      totalAssets = totalAssets.plus(netAsset);
      assetItems.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        balance: netAsset.toString(),
      });
    } else if (acc.type === 'LIABILITY') {
      const netLiability = accCredit.minus(accDebit);
      totalLiabilities = totalLiabilities.plus(netLiability);
      liabilityItems.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        balance: netLiability.toString(),
      });
    } else if (acc.type === 'EQUITY') {
      const netEquity = accCredit.minus(accDebit);
      totalEquity = totalEquity.plus(netEquity);
      equityItems.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        balance: netEquity.toString(),
      });
    }
  }

  // Include cumulative retained earnings in equity
  const pnl = await getProfitAndLoss(businessId, undefined, targetDate);
  const netEarnings = new Prisma.Decimal(pnl.netProfitOrLoss);
  if (!netEarnings.isZero()) {
    totalEquity = totalEquity.plus(netEarnings);
    equityItems.push({
      accountId: 'retained-earnings',
      accountCode: 'RE-NET',
      accountName: 'Current Period Retained Earnings',
      balance: netEarnings.toString(),
    });
  }

  const totalLiabilitiesAndEquity = totalLiabilities.plus(totalEquity);
  const isBalanced = totalAssets.equals(totalLiabilitiesAndEquity);

  return {
    businessId,
    asOfDate: targetDate.toISOString(),
    generatedAt: new Date().toISOString(),
    assets: {
      items: assetItems,
      total: totalAssets.toString(),
    },
    liabilities: {
      items: liabilityItems,
      total: totalLiabilities.toString(),
    },
    equity: {
      items: equityItems,
      total: totalEquity.toString(),
    },
    totalAssets: totalAssets.toString(),
    totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toString(),
    isBalanced,
  };
}
