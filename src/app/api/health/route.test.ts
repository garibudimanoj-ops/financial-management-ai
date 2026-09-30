import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mockQueryRaw = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: mockQueryRaw },
}));

describe('health route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns only minimal status information when healthy', async () => {
    mockQueryRaw.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('returns a generic unavailable status when the database check fails', async () => {
    mockQueryRaw.mockRejectedValue(new Error('postgres://private-host/secret-db'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
    expect(consoleError).toHaveBeenCalledWith('[Health Check] Database check failed', 'Error');
    consoleError.mockRestore();
  });
});
