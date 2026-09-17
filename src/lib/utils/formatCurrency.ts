/**
 * Formats a numeric or Decimal value into currency with proper symbol and decimal precision.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = 'INR'
): string {
  if (value == null || value === '') {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}0.00`;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}0.00`;
  }

  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
