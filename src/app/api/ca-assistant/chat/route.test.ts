import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { AppError } from '@/lib/errors';

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
  generateContent: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.generateContent };
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
    mocks.generateContent.mockResolvedValue({ text: 'Verified natural-language response.' });
    mocks.prisma.invoice.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
    mocks.prisma.invoice.count.mockResolvedValue(0);
    mocks.prisma.invoice.findMany.mockResolvedValue([]);
    mocks.prisma.expense.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
    mocks.prisma.customer.findMany.mockResolvedValue([]);
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('returns a controlled error when Gemini is not configured', async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'Show current sales',
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'AI service is not configured.' });
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

  it('rejects unauthenticated users before Gemini', async () => {
    mocks.requireBusinessContext.mockRejectedValue(new AppError('Unauthorized', 'UNAUTHORIZED'));

    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'Show current sales',
    }));

    expect(response.status).toBe(401);
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it('rejects users without CA Assistant permission', async () => {
    mocks.hasPermission.mockReturnValue(false);

    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'Show current sales',
    }));

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimitShared).not.toHaveBeenCalled();
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it('rejects a business id outside the authenticated context', async () => {
    const response = await POST(makeRequest({
      businessId: 'other-business',
      message: 'Show current sales',
    }));

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimitShared).not.toHaveBeenCalled();
    expect(mocks.generateContent).not.toHaveBeenCalled();
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

  it('accepts bounded conversation history and sends it to Gemini', async () => {
    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'How much of that is unpaid?',
      history: [{ role: 'user', content: 'What are my sales?' }],
    }));

    expect(response.status).toBe(200);
    expect(mocks.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-3.5-flash-lite',
      contents: expect.stringContaining('What are my sales?'),
    }));
  });

  it('keeps all Prisma evidence scoped to the authenticated business', async () => {
    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'Show current sales',
    }));

    expect(response.status).toBe(200);
    expect(mocks.prisma.invoice.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ businessId: 'business-1' }),
    }));
    expect(mocks.prisma.invoice.count).toHaveBeenCalledWith({
      where: { businessId: 'business-1' },
    });
  });

  it('returns a generic error when Gemini fails', async () => {
    mocks.generateContent.mockRejectedValue(new Error('provider details'));

    const response = await POST(makeRequest({
      businessId: 'business-1',
      message: 'Show current sales',
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'The AI assistant is temporarily unavailable. Please try again.',
    });
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
