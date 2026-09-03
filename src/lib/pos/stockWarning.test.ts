import { describe, it, expect } from 'vitest';
import { getStockWarning } from './stockWarning';

describe('getStockWarning', () => {
  it('returns null when the cart quantity is below available stock', () => {
    expect(getStockWarning(2, 10)).toBeNull();
    expect(getStockWarning(9, 10)).toBeNull();
  });

  it('returns a low-stock warning when the cart quantity reaches available stock', () => {
    expect(getStockWarning(10, 10)).toBe('Last 10 available');
    expect(getStockWarning(12, 10)).toBe('Last 10 available');
  });

  it('returns an out-of-stock warning when available stock is zero', () => {
    expect(getStockWarning(1, 0)).toBe('Out of stock');
    expect(getStockWarning(5, 0)).toBe('Out of stock');
  });

  it('treats negative available stock as unknown and shows no warning', () => {
    // Negative stock is a data anomaly, not a real out-of-stock state, so the
    // helper stays safe and defers to the authoritative server at checkout.
    expect(getStockWarning(1, -3)).toBeNull();
  });

  it('is safe for non-finite available stock', () => {
    expect(getStockWarning(1, Number.POSITIVE_INFINITY)).toBeNull();
    expect(getStockWarning(1, Number.NaN)).toBeNull();
  });

  it('is safe for non-finite cart quantities', () => {
    expect(getStockWarning(Number.POSITIVE_INFINITY, 10)).toBeNull();
    expect(getStockWarning(Number.NaN, 10)).toBeNull();
    expect(getStockWarning(-1, 10)).toBeNull();
  });
});