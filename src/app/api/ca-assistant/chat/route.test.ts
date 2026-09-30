import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  requireBusinessContext: vi.fn(),
  hasPermission: vi.fn(),
  checkRateLimitShared: vi.fn(),
  logAuditEvent: vi.fn(),
  prisma: {
    invoice: { aggregate: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    expense: { aggregate: vi.fn() },
    customer: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  requireBusinessContext: (...args: unknown[]) => mocks.requireBusinessContext(...args),
  hasPermission: (...args: unknown[]) => mocks.hasPermission(...args),
}));
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimitShared: (...args: unknown[]) => mocks.checkRateLimitShared(...args),
}));
vi.mock('@/lib/audit', () => ({
  logAuditEvent: (...args: unknown[]) => mocks.logAuditEvent(...args),
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ca-assistant/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('CA Assistant API boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireBusinessContext.mockResolvedValue({
      userId: 'user-1',
      businessId: 'business-1',
      role: 'OWNER',
    });
    mocks.hasPermission.mockReturnValue(true);
    mocks.checkRateLimitShared.mockResolvedValue(true);
    mocks.logAuditEvent.mockResolvedValue(undefined);
  });

  it('rejects oversized requests before authentication or data access', async () => {
    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'x'.repeat(16 * 1024 + 1),
    }));

    expect(response.status).toBe(413);
    expect(mocks.requireBusinessContext).not.toHaveBeenCalled();
  });

  it('rejects messages outside the bounded schema', async () => {
    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'x'.repeat(4001),
    }));

    expect(response.status).toBe(400);
    expect(mocks.requireBusinessContext).not.toHaveBeenCalled();
  });

  it('applies the shared per-user rate limit before audit or data access', async () => {
    mocks.checkRateLimitShared.mockResolvedValue(false);

    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'Show current sales',
    }));

    expect(response.status).toBe(429);
    expect(mocks.checkRateLimitShared).toHaveBeenCalledWith(
      'ca-assistant:user:user-1',
      30,
      60000
    );
    expect(mocks.logAuditEvent).not.toHaveBeenCalled();
    expect(mocks.prisma.invoice.aggregate).not.toHaveBeenCalled();
  });

  it('records message length instead of persisting the user question', async () => {
    const message = 'Please summarize this financial report';
    const response = await POST(makeRequest({ businessId: 'business-1', message }));

    expect(response.status).toBe(200);
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.objectContaining({
        message_length: message.length,
      }),
    }));
    expect(mocks.logAuditEvent.mock.calls[0][0].details).not.toHaveProperty('message_preview');
  });
});
