/**
 * Cashier-facing low-stock warning for a POS cart line.
 *
 * Pure, dependency-free, and safe to reuse from the UI. The server remains the
 * final authority on stock validation; this is only a hint.
 *
 * - available <= 0            -> 'Out of stock'
 * - cart quantity >= available -> 'Last {available} available'
 * - otherwise                 -> null (no warning)
 */
export function getStockWarning(quantity: number, available: number): string | null {
  if (!Number.isFinite(available) || available < 0) return null;
  if (available <= 0) return 'Out of stock';
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  if (quantity >= available) return `Last ${available} available`;
  return null;
}