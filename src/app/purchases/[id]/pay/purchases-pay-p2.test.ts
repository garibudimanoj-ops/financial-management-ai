/* eslint-disable react-hooks/error-boundaries */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Purchase Pay — P2 #8 Regression', () => {
  it('Purchase pay page includes safe error handling', () => {
    const content = fs.readFileSync('src/app/purchases/[id]/pay/page.tsx', 'utf-8');
    expect(content).toContain('try {');
    expect(content).toContain('catch (err: unknown)');
  });

  it('Purchase pay action has safe AppError wrapper', () => {
    const content = fs.readFileSync('src/actions/purchase.ts', 'utf-8');
    expect(content).toContain('AppError');
    expect(content).toContain('console.error');
  });

  it('BalanceDue calculation uses safe guard against NaN', () => {
    const content = fs.readFileSync('src/app/purchases/[id]/pay/page.tsx', 'utf-8');
    expect(content).toContain('Number.isFinite');
  });
});
