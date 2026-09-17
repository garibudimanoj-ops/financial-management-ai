import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError } from '@/lib/errors';
import { POST as postAiIngest } from './ai/ingest/route';

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  checkRateLimit: vi.fn(),
  parseFinancialDocument: vi.fn(),
  prisma: {
    invoice: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
    customer: { findMany: vi.fn() },
    category: { findMany: vi.fn() },
    vendor: { findMany: vi.fn() },
    expense: { findMany: vi.fn() },
    bankAccount: { findMany: vi.fn() },
    attachment: { findMany: vi.fn() },
    business: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  requirePermission: (...args: unknown[]) => mocks.requirePermission(...args),
}));

vi.mock('@/services/ai/documentParser', () => ({
  parseFinancialDocument: (...args: unknown[]) => mocks.parseFinancialDocument(...args),
}));

vi.mock('@/services/ai/llmOrchestrator', () => ({
  orchestrateDocumentToDraftTransaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

function request(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('API error message leakage prevention', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requirePermission.mockResolvedValue({
      userId: 'user-own',
      userEmail: 'owner@example.com',
      supabaseUserId: 'supabase-own',
      businessId: 'business-own',
      role: 'OWNER' as const,
      membershipStatus: 'ACTIVE',
    });
    mocks.checkRateLimit.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not leak database error messages to clients in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const dbError = new Error('connection refused: host=secret-db user=admin');
    mocks.parseFinancialDocument.mockRejectedValue(dbError);

    const response = await postAiIngest(
      request('http://localhost/api/ai/ingest', { businessId: 'business-own', fileName: 'invoice.pdf' })
    );

    const body = await response.json();

    expect(body.error).not.toContain('connection refused');
    expect(body.error).not.toContain('secret-db');
    expect(body.error).not.toContain('user=admin');
    expect(body.error).not.toContain('host=');
    expect(body.error).toBe('Internal Server Error');
  });

  it('does not leak stack traces in unexpected errors', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const dbError = new Error('Unexpected database failure');
    mocks.parseFinancialDocument.mockRejectedValue(dbError);

    const response = await postAiIngest(
      request('http://localhost/api/ai/ingest', { businessId: 'business-own', fileName: 'invoice.pdf' })
    );

    const body = await response.json();

    expect(body.error).not.toContain('at Object');
    expect(body.error).not.toContain('at process');
    expect(body.error).not.toContain('node_modules');
  });

  it('returns generic message for unexpected errors in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.parseFinancialDocument.mockRejectedValue(new Error('Something broke'));

    const response = await postAiIngest(
      request('http://localhost/api/ai/ingest', { businessId: 'business-own', fileName: 'invoice.pdf' })
    );

    const body = await response.json();

    expect(body.error).toBe('Internal Server Error');
  });

  it('still returns AppError messages for known errors', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.parseFinancialDocument.mockRejectedValue(new AppError('Invalid file format', 'VALIDATION_ERROR'));

    const response = await postAiIngest(
      request('http://localhost/api/ai/ingest', { businessId: 'business-own', fileName: 'invoice.pdf' })
    );

    const body = await response.json();

    expect(body.error).toBe('Invalid file format');
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('shows detailed errors in development for debugging', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const dbError = new Error('connection refused: host=secret-db user=admin');
    mocks.parseFinancialDocument.mockRejectedValue(dbError);

    const response = await postAiIngest(
      request('http://localhost/api/ai/ingest', { businessId: 'business-own', fileName: 'invoice.pdf' })
    );

    const body = await response.json();

    expect(body.error).toContain('connection refused');
    expect(body.error).toContain('secret-db');
  });
});
