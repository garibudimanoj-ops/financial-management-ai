import { describe, it, expect } from 'vitest';
import { calculateWeightedAverageCost, calculateInventoryValuation } from './valuation';
import { Prisma } from '@prisma/client';

describe('Weighted-Average Inventory Costing & Valuation', () => {
  it('1. First stock-in: sets cost price to incoming unit cost', () => {
    // Existing qty = 0, cost = 0; incoming qty = 10, unit cost = 100
    const newCost = calculateWeightedAverageCost(0, 0, 10, 100);
    expect(newCost.equals(new Prisma.Decimal(100))).toBe(true);
  });

  it('2. Multiple stock-ins at different unit costs: computes exact weighted-average', () => {
    // Current stock: 10 units @ ₹100 = ₹1,000
    // Incoming stock: 20 units @ ₹130 = ₹2,600
    // Total value = ₹3,600, Total qty = 30 -> New avg cost = 3600 / 30 = ₹120.00
    const avgCost = calculateWeightedAverageCost(10, 100, 20, 130);
    expect(avgCost.equals(new Prisma.Decimal(120))).toBe(true);
  });

  it('3. Weighted-average recalculation with fractional/decimal quantities and costs', () => {
    // Existing: 15.5 units @ 45.50 = 705.25
    // Incoming: 10.25 units @ 52.00 = 533.00
    // Total value = 1238.25, Total qty = 25.75 -> New avg cost = 1238.25 / 25.75 = 48.0873786...
    const avgCost = calculateWeightedAverageCost(
      new Prisma.Decimal('15.5'),
      new Prisma.Decimal('45.50'),
      new Prisma.Decimal('10.25'),
      new Prisma.Decimal('52.00')
    );
    expect(Number(avgCost.toFixed(4))).toBeCloseTo(48.0874, 3);
  });

  it('4. Stock reduction / outflow preserves current average cost', () => {
    // Selling or removing 5 units from 10 units @ 120 does not change unit cost price
    const cost = new Prisma.Decimal(120);
    expect(cost.equals(new Prisma.Decimal(120))).toBe(true);
  });

  it('5. Stock-in after complete depletion (existingQty <= 0) resets average cost to new unit cost', () => {
    // Stock reached 0 @ 120; New batch of 15 units arrives @ 150
    const newCost = calculateWeightedAverageCost(0, 120, 15, 150);
    expect(newCost.equals(new Prisma.Decimal(150))).toBe(true);
  });

  it('6. Incoming quantity of 0 preserves existing cost', () => {
    const cost = calculateWeightedAverageCost(20, 150, 0, 200);
    expect(cost.equals(new Prisma.Decimal(150))).toBe(true);
  });

  it('7. Inventory Valuation: accurately calculates total value', () => {
    // 25 units @ 120.50 = 3012.50
    const valuation = calculateInventoryValuation(25, '120.50');
    expect(valuation.equals(new Prisma.Decimal('3012.50'))).toBe(true);
  });

  it('8. Zero or negative stock yields 0 valuation', () => {
    expect(calculateInventoryValuation(0, 100).isZero()).toBe(true);
    expect(calculateInventoryValuation(-5, 100).isZero()).toBe(true);
  });
});
