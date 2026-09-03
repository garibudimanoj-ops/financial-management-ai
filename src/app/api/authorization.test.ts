import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  requireRole: vi.fn(),
  createTransaction: vi.fn(),
  listTransactions: vi.fn(),
  getTrialBalance: vi.fn(),
  prisma: {
    account: { findMany: vi.fn() },
    transaction: { count: vi.fn(), create: vi.fn() },
  },
  parseFinancialDocument: vi.fn(),
  orchestrateDocumentToDraftTransaction: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requirePermission: mocks.requirePermission,
  requireRole: mocks.requireRole,
}));
vi.mock('@/services/accounting/transactionService', () => ({
  createTransaction: mocks.createTransaction,
  listTransactions: mocks.listTransactions,
}));
vi.mock('@/services/accounting/reportService', () => ({
  getTrialBalance: mocks.getTrialBalance,
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/services/ai/documentParser', () => ({
  parseFinancialDocument: mocks.parseFinancialDocument,
}));
vi.mock('@/services/ai/llmOrchestrator', () => ({
  orchestrateDocumentToDraftTransaction: mocks.orchestrateDocumentToDraftTransaction,
}));

import { GET as getTransactions, POST as postTransaction } from './transactions/route';
import { GET as getTrialBalanceRoute } from './reports/trial-balance/route';
import { POST as postAiIngest } from './ai/ingest/route';

const ownContext = {
  userId: 'user-own',
  userEmail: 'owner@example.com',
  supabaseUserId: 'supabase-own',
  businessId: 'business-own',
  role: 'OWNER' as const,
  membershipStatus: 'ACTIVE',
};

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

describe('protected API authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requirePermission.mockResolvedValue(ownContext);
    mocks.requireRole.mockResolvedValue(ownContext);
    mocks.listTransactions.mockResolvedValue({ total: 0, transactions: [] });
    mocks.getTrialBalance.mockResolvedValue({ businessId: 'business-own', items: [] });
    mocks.createTransaction.mockResolvedValue({ id: 'txn-own' });
  });

  it('returns 401 and performs no read for an unauthenticated transaction request', async () => {
    mocks.requirePermission.mockRejectedValue(new AppError('Unauthorized', 'UNAUTHORIZED'));

    const response = await getTransactions(request('http://localhost/api/transactions?businessId=business-own'));

    expect(response.status).toBe(401);
    expect(mocks.listTransactions).not.toHaveBeenCalled();
  });

  it('returns 403 and performs no read without membership in the requested business', async () => {
    mocks.requirePermission.mockRejectedValue(new AppError('Forbidden', 'FORBIDDEN'));

    const response = await getTrialBalanceRoute(request('http://localhost/api/reports/trial-balance?businessId=business-other'));

    expect(response.status).toBe(403);
    expect(mocks.getTrialBalance).not.toHaveBeenCalled();
  });

  it('uses the authenticated business context for an authorized read', async () => {
    const response = await getTransactions(request('http://localhost/api/transactions'));

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith(undefined, 'REPORT_READ');
    expect(mocks.listTransactions).toHaveBeenCalledWith('business-own', { limit: 50, offset: 0, status: undefined });
  });

  it('prevents cross-tenant writes and ignores caller-supplied user identity', async () => {
    const response = await postTransaction(
      request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          businessId: 'business-other',
          userId: 'attacker-user',
          description: 'Authorized transaction',
          entries: [
            { accountId: 'cash-own', debit: '10.00', credit: '0.00' },
            { accountId: 'sales-own', debit: '0.00', credit: '10.00' },
          ],
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.requireRole).toHaveBeenCalledWith('business-other', ['OWNER', 'ADMIN']);
    expect(mocks.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
      businessId: 'business-own',
      userId: 'user-own',
    }));
  });

  it('returns 401 for unauthenticated AI ingestion before tenant data access', async () => {
    mocks.requirePermission.mockRejectedValue(new AppError('Unauthorized', 'UNAUTHORIZED'));

    const response = await postAiIngest(
      request('http://localhost/api/ai/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId: 'business-own', fileName: 'invoice.pdf' }),
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.parseFinancialDocument).not.toHaveBeenCalled();
    expect(mocks.prisma.account.findMany).not.toHaveBeenCalled();
  });
});
