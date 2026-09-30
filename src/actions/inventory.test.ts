import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addStockAction } from './inventory';
import { requirePermission } from '@/lib/auth';
import { AppError } from '@/lib/errors';

vi.mock('@/lib/auth', () => ({
  requirePermission: vi.fn(),
}));

vi.mock('@/lib/inventory/service', () => ({
  addStock: vi.fn(),
  adjustStock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Inventory actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('requires inventory-adjust permission to receive stock', async () => {
    vi.mocked(requirePermission).mockRejectedValue(
      new AppError('Forbidden: Insufficient permissions (INVENTORY_ADJUST)', 'FORBIDDEN')
    );

    await expect(addStockAction('biz-1', {
      productId: 'product-1',
      quantity: 2,
      unitCost: 10,
    })).rejects.toThrow('INVENTORY_ADJUST');

    expect(requirePermission).toHaveBeenCalledWith('biz-1', 'INVENTORY_ADJUST');
  });
});
