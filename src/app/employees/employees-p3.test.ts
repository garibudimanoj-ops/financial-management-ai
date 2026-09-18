/* eslint-disable react-hooks/error-boundaries */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Employees — P3 Regression', () => {
  it('Employees page includes try/catch with safe error message', () => {
    const content = fs.readFileSync('src/app/employees/page.tsx', 'utf-8');
    expect(content).toContain('try {');
    expect(content).toContain('catch (err: unknown)');
    expect(content).toContain('console.error');
  });
});
