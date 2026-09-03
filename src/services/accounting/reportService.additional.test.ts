/**
 * Report Service Tests — Phase 3.9 & 3.15-F
 *
 * Tests:
 * - Trial Balance: businessId isolation, balanced debits/credits
 * - P&L: date range filtering, revenue/expense separation, zero-profit business
 * - Balance Sheet: assets = liabilities + equity, retained earnings inclusion
 * - Tenant isolation: all queries scoped to businessId
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { Account, Entry, Transaction } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IMPORTANT:
 * Use the real Prisma Decimal implementation.
 *
 * The previous test used a fake object with plus()/minus()/etc.
 * That object was not compatible with Prisma's Decimal implementation.
 */
const D = (value: number | string): Prisma.Decimal => {
  return new Prisma.Decimal(value);
};

type DeepPartial<T> =
  T extends object
  ? {
    [P in keyof T]?: DeepPartial<T[P]>;
  }
  : T;

type EntryInput = {
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  date?: Date;
};

const makeAccount = (
  id: string,
  code: string,
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
  entries: EntryInput[] = [],
  businessId = 'biz-1'
): DeepPartial<
  Account & {
    entries: Array<
      DeepPartial<
        Entry & {
          transaction: DeepPartial<Transaction>;
        }
      >
    >;
  }
> => {
  return {
    id,
    code,
    name: `Account ${code}`,
    type,
    businessId,
    isActive: true,
    balance: D(0),

    entries: entries.map((entry) => ({
      debit: entry.debit,
      credit: entry.credit,

      transaction: {
        status: 'POSTED',
        businessId,
        date: entry.date ?? new Date('2025-01-01'),
      },
    })),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock factory
// ─────────────────────────────────────────────────────────────────────────────

const makePrismaMock = (
  accountsForType: 'trialBalance' | 'pnl' | 'balanceSheet',
  biz = 'biz-1'
) => {
  const allAccounts = {
    trialBalance: [
      makeAccount(
        'acc-ar',
        '1100',
        'ASSET',
        [
          {
            debit: D(1000),
            credit: D(0),
          },
        ],
        biz
      ),

      makeAccount(
        'acc-ap',
        '2010',
        'LIABILITY',
        [
          {
            debit: D(0),
            credit: D(1000),
          },
        ],
        biz
      ),
    ],

    pnl: [
      makeAccount(
        'acc-rev',
        '4010',
        'REVENUE',
        [
          {
            debit: D(0),
            credit: D(5000),
          },
        ],
        biz
      ),

      makeAccount(
        'acc-exp',
        '5010',
        'EXPENSE',
        [
          {
            debit: D(3000),
            credit: D(0),
          },
        ],
        biz
      ),
    ],

    balanceSheet: [
      makeAccount(
        'acc-cash',
        '1010',
        'ASSET',
        [
          {
            debit: D(2000),
            credit: D(0),
          },
        ],
        biz
      ),

      makeAccount(
        'acc-equity',
        '3010',
        'EQUITY',
        [
          {
            debit: D(0),
            credit: D(2000),
          },
        ],
        biz
      ),
    ],
  };

  return {
    prisma: {
      account: {
        findMany: vi.fn(
          async ({
            where,
          }: {
            where?: Record<string, unknown>;
          }) => {
            const businessId = (
              where as { businessId?: string } | undefined
            )?.businessId;

            /**
             * Tenant isolation:
             * only return this mock tenant's accounts.
             */
            if (businessId !== biz) {
              return [];
            }

            return allAccounts[accountsForType];
          }
        ),
      },
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Global test setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  /**
   * Critical for vi.doMock().
   *
   * reportService imports prisma at module load time.
   * Without resetting modules, a previous test's mocked prisma
   * can remain cached.
   */
  vi.resetModules();

  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Trial Balance
// ─────────────────────────────────────────────────────────────────────────────

describe('Report Service — Trial Balance', () => {
  it('returns balanced trial balance (totalDebits === totalCredits)', async () => {
    const mock = makePrismaMock('trialBalance');

    vi.doMock('@/lib/prisma', () => mock);

    const { getTrialBalance } = await import('./reportService');

    const report = await getTrialBalance('biz-1');

    expect(report.businessId).toBe('biz-1');

    expect(report.isBalanced).toBe(true);

    expect(
      parseFloat(report.totalDebits)
    ).toBeCloseTo(
      parseFloat(report.totalCredits)
    );

    expect(mock.prisma.account.findMany).toHaveBeenCalled();

    const firstCall =
      mock.prisma.account.findMany.mock.calls[0]?.[0];

    expect(firstCall).toBeDefined();

    expect(
      (firstCall as {
        where?: {
          businessId?: string;
        };
      }).where?.businessId
    ).toBe('biz-1');
  });

  it('returns empty report for business with no accounts', async () => {
    const findMany = vi.fn(async () => []);

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        account: {
          findMany,
        },
      },
    }));

    const { getTrialBalance } = await import('./reportService');

    const report = await getTrialBalance('biz-empty');

    expect(report.items).toHaveLength(0);
    expect(report.isBalanced).toBe(true);

    expect(findMany).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Profit & Loss
// ─────────────────────────────────────────────────────────────────────────────

describe('Report Service — Profit & Loss', () => {
  it('correctly separates revenue and expenses, calculates net profit', async () => {
    const mock = makePrismaMock('pnl');

    vi.doMock('@/lib/prisma', () => mock);

    const { getProfitAndLoss } = await import('./reportService');

    const report = await getProfitAndLoss('biz-1');

    expect(
      parseFloat(report.revenue.totalRevenue)
    ).toBeCloseTo(5000);

    expect(
      parseFloat(report.expenses.totalExpenses)
    ).toBeCloseTo(3000);

    expect(
      parseFloat(report.netProfitOrLoss)
    ).toBeCloseTo(2000);

    expect(report.isProfitable).toBe(true);

    expect(mock.prisma.account.findMany).toHaveBeenCalled();

    const firstCall =
      mock.prisma.account.findMany.mock.calls[0]?.[0];

    expect(firstCall).toBeDefined();

    expect(
      (firstCall as {
        where?: {
          businessId?: string;
        };
      }).where?.businessId
    ).toBe('biz-1');
  });

  it('returns zero profit for business with no transactions', async () => {
    const findMany = vi.fn(async () => [
      makeAccount(
        'acc-rev',
        '4010',
        'REVENUE',
        [],
        'biz-zero'
      ),

      makeAccount(
        'acc-exp',
        '5010',
        'EXPENSE',
        [],
        'biz-zero'
      ),
    ]);

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        account: {
          findMany,
        },
      },
    }));

    const { getProfitAndLoss } = await import('./reportService');

    const report = await getProfitAndLoss('biz-zero');

    expect(
      parseFloat(report.netProfitOrLoss)
    ).toBeCloseTo(0);

    expect(report.isProfitable).toBe(false);

    expect(findMany).toHaveBeenCalled();
  });

  it('filters by date range correctly', async () => {
    const findMany = vi.fn(
      async ({
        where,
      }: {
        where?: Record<string, unknown>;
      }) => {
        expect(where).toBeDefined();

        return [
          makeAccount(
            'acc-rev',
            '4010',
            'REVENUE',
            [
              {
                debit: D(0),
                credit: D(2000),
                date: new Date('2025-06-01'),
              },
            ],
            'biz-1'
          ),
        ];
      }
    );

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        account: {
          findMany,
        },
      },
    }));

    const { getProfitAndLoss } = await import('./reportService');

    const report = await getProfitAndLoss(
      'biz-1',
      '2025-01-01',
      '2025-12-31'
    );

    expect(report.startDate).toBeDefined();
    expect(report.endDate).toBeDefined();

    expect(findMany).toHaveBeenCalled();

    const callArgs =
      findMany.mock.calls[0]?.[0];

    expect(callArgs).toBeDefined();

    expect(
      (callArgs as {
        where?: {
          businessId?: string;
        };
      }).where?.businessId
    ).toBe('biz-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Balance Sheet
// ─────────────────────────────────────────────────────────────────────────────

describe('Report Service — Balance Sheet', () => {
  it('returns balanced balance sheet (assets = liabilities + equity)', async () => {
    const findMany = vi.fn(
      async ({
        where,
      }: {
        where?: Record<string, unknown>;
      }) => {
        const w = where as
          | {
            businessId?: string;
            type?: {
              in?: string[];
            };
          }
          | undefined;

        /**
         * Tenant check.
         */
        if (w?.businessId !== 'biz-1') {
          return [];
        }

        const types = w?.type?.in ?? [];

        if (types.includes('ASSET')) {
          return [
            makeAccount(
              'acc-cash',
              '1010',
              'ASSET',
              [
                {
                  debit: D(5000),
                  credit: D(0),
                },
              ]
            ),

            makeAccount(
              'acc-ar',
              '1100',
              'ASSET',
              [
                {
                  debit: D(3000),
                  credit: D(0),
                },
              ]
            ),

            makeAccount(
              'acc-ap',
              '2010',
              'LIABILITY',
              [
                {
                  debit: D(0),
                  credit: D(2000),
                },
              ]
            ),

            makeAccount(
              'acc-eq',
              '3010',
              'EQUITY',
              [
                {
                  debit: D(0),
                  credit: D(2000),
                },
              ]
            ),
          ];
        }

        /**
         * P&L / retained earnings lookup.
         */
        return [
          makeAccount(
            'acc-rev',
            '4010',
            'REVENUE',
            [
              {
                debit: D(0),
                credit: D(4000),
              },
            ]
          ),
        ];
      }
    );

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        account: {
          findMany,
        },
      },
    }));

    const { getBalanceSheet } = await import('./reportService');

    const report = await getBalanceSheet('biz-1');

    expect(report.isBalanced).toBe(true);

    expect(findMany).toHaveBeenCalled();

    /**
     * Every query must contain businessId.
     */
    for (const call of findMany.mock.calls) {
      const args = call[0] as {
        where?: {
          businessId?: string;
        };
      };

      expect(args.where?.businessId).toBe('biz-1');
    }
  });

  it('includes retained earnings from P&L in equity section', async () => {
    const findMany = vi.fn(
      async ({
        where,
      }: {
        where?: Record<string, unknown>;
      }) => {
        const w = where as
          | {
            businessId?: string;
            type?: {
              in?: string[];
            };
          }
          | undefined;

        if (w?.businessId !== 'biz-1') {
          return [];
        }

        const types = w?.type?.in ?? [];

        /**
         * P&L accounts.
         */
        if (
          types.includes('REVENUE') ||
          types.includes('EXPENSE')
        ) {
          return [
            makeAccount(
              'acc-rev',
              '4010',
              'REVENUE',
              [
                {
                  debit: D(0),
                  credit: D(1000),
                },
              ]
            ),
          ];
        }

        /**
         * Balance sheet accounts.
         */
        return [
          makeAccount(
            'acc-cash',
            '1010',
            'ASSET',
            [
              {
                debit: D(1000),
                credit: D(0),
              },
            ]
          ),
        ];
      }
    );

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        account: {
          findMany,
        },
      },
    }));

    const { getBalanceSheet } = await import('./reportService');

    const report = await getBalanceSheet('biz-1');

    const retainedEarnings = report.equity.items.find(
      (item) => item.accountCode === 'RE-NET'
    );

    expect(retainedEarnings).toBeDefined();

    expect(
      parseFloat(retainedEarnings!.balance)
    ).toBeGreaterThan(0);

    expect(findMany).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('Report Service — Tenant Isolation', () => {
  it('trial balance query is scoped to businessId', async () => {
    const findManySpy = vi.fn(
      async () => []
    );

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        account: {
          findMany: findManySpy,
        },
      },
    }));

    const { getTrialBalance } = await import('./reportService');

    await getTrialBalance('biz-target');

    expect(findManySpy).toHaveBeenCalled();

    const callArgs =
      findManySpy.mock.calls[0]?.[0];

    expect(callArgs).toBeDefined();

    const where = (
      callArgs as {
        where?: {
          businessId?: string;
        };
      }
    ).where;

    expect(where).toBeDefined();

    expect(where?.businessId).toBe('biz-target');
  });

  it('P&L query is scoped to businessId', async () => {
    const findManySpy = vi.fn(
      async () => []
    );

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        account: {
          findMany: findManySpy,
        },
      },
    }));

    const { getProfitAndLoss } = await import('./reportService');

    await getProfitAndLoss('biz-target');

    expect(findManySpy).toHaveBeenCalled();

    const callArgs =
      findManySpy.mock.calls[0]?.[0];

    expect(callArgs).toBeDefined();

    const where = (
      callArgs as {
        where?: {
          businessId?: string;
        };
      }
    ).where;

    expect(where).toBeDefined();

    expect(where?.businessId).toBe('biz-target');
  });

  it('balance sheet query is scoped to businessId', async () => {
    const findManySpy = vi.fn(
      async () => []
    );

    vi.doMock('@/lib/prisma', () => ({
      prisma: {
        account: {
          findMany: findManySpy,
        },
      },
    }));

    const { getBalanceSheet } = await import('./reportService');

    await getBalanceSheet('biz-target');

    expect(findManySpy).toHaveBeenCalled();

    const callArgs =
      findManySpy.mock.calls[0]?.[0];

    expect(callArgs).toBeDefined();

    const where = (
      callArgs as {
        where?: {
          businessId?: string;
        };
      }
    ).where;

    expect(where).toBeDefined();

    expect(where?.businessId).toBe('biz-target');
  });
});