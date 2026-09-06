import { describe, expect, it } from 'vitest';
import { calculateIndianGst, calculatePurchaseTotals } from './calculations';

describe('purchase calculations', () => {
  it('uses a line-level discount consistently and calculates tax deterministically', () => {
    const total = calculatePurchaseTotals([{ quantity: '2', unitCost: '100', discount: '10', taxRate: '18' }]);
    expect(total.subtotal.toString()).toBe('200');
    expect(total.discountAmount.toString()).toBe('10');
    expect(total.taxAmount.toString()).toBe('34.2');
    expect(total.totalAmount.toString()).toBe('224.2');
  });

  it('splits intra-state GST and assigns inter-state GST to IGST', () => {
    const tax = calculatePurchaseTotals([{ quantity: 1, unitCost: 100, taxRate: 18 }]).taxAmount;
    expect(calculateIndianGst(tax, 'Maharashtra', 'Maharashtra')).toMatchObject({ cgstAmount: expect.anything(), sgstAmount: expect.anything(), igstAmount: expect.anything() });
    expect(calculateIndianGst(tax, 'Maharashtra', 'Karnataka').igstAmount.toString()).toBe('18');
  });
});
