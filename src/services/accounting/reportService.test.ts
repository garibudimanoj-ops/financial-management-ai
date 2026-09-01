import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTrialBalance, getProfitAndLoss, getBalanceSheet } from './reportService';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findMany: vi.fn(),
    },
  },
}));

describe('Accounting Report Service - Trial Balance, P&L, Balance Sheet', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTrialBalance', () => {
    it('should aggregate debits and credits correctly and verify zero net imbalance', async () => {
      vi.mocked(prisma.account.findMany).mockResolvedValue([
        {
          id: 'acc-cash',
          code: '1010',
          name: 'Cash',
          type: 'ASSET',
          entries: [{ debit: new Prisma.Decimal('5000'), credit: new Prisma.Decimal('0') }],
        },
        {
          id: 'acc-bank',
          code: '1020',
          name: 'Bank',
          type: 'ASSET',
          entries: [{ debit: new Prisma.Decimal('15000'), credit: new Prisma.Decimal('0') }],
        },
        {
          id: 'acc-equity',
          code: '3010',
          name: "Owner's Equity",
          type: 'EQUITY',
          entries: [{ debit: new Prisma.Decimal('0'), credit: new Prisma.Decimal('20000') }],
        },
      ] as any);

      const report = await getTrialBalance('biz-1');

      expect(report.totalDebits).toBe('20000');
      expect(report.totalCredits).toBe('20000');
      expect(report.isBalanced).toBe(true);
      expect(report.items).toHaveLength(3);
    });
  });

  describe('getProfitAndLoss', () => {
    it('should compute net profit from revenue minus expenses', async () => {
      vi.mocked(prisma.account.findMany).mockResolvedValue([
        {
          id: 'acc-rev',
          code: '4010',
          name: 'Sales Revenue',
          type: 'REVENUE',
          entries: [{ debit: new Prisma.Decimal('0'), credit: new Prisma.Decimal('100000') }],
        },
        {
          id: 'acc-exp-rent',
          code: '5020',
          name: 'Rent Expense',
          type: 'EXPENSE',
          entries: [{ debit: new Prisma.Decimal('30000'), credit: new Prisma.Decimal('0') }],
        },
      ] as any);

      const pnl = await getProfitAndLoss('biz-1', '2026-01-01', '2026-12-31');

      expect(pnl.revenue.totalRevenue).toBe('100000');
      expect(pnl.expenses.totalExpenses).toBe('30000');
      expect(pnl.netProfitOrLoss).toBe('70000');
      expect(pnl.isProfitable).toBe(true);
    });
  });

  describe('getBalanceSheet', () => {
    it('should generate balanced balance sheet (Assets = Liabilities + Equity + Retained Earnings)', async () => {
      // First call for BS accounts, second call for PnL
      vi.mocked(prisma.account.findMany)
        .mockResolvedValueOnce([
          {
            id: 'acc-cash',
            code: '1010',
            name: 'Cash',
            type: 'ASSET',
            entries: [{ debit: new Prisma.Decimal('50000'), credit: new Prisma.Decimal('0') }],
          },
          {
            id: 'acc-capital',
            code: '3010',
            name: 'Capital',
            type: 'EQUITY',
            entries: [{ debit: new Prisma.Decimal('0'), credit: new Prisma.Decimal('50000') }],
          },
        ] as any)
        .mockResolvedValueOnce([] as any); // P&L accounts (0 net income)

      const bs = await getBalanceSheet('biz-1', '2026-12-31');

      expect(bs.totalAssets).toBe('50000');
      expect(bs.totalLiabilitiesAndEquity).toBe('50000');
      expect(bs.isBalanced).toBe(true);
    });
  });
});
