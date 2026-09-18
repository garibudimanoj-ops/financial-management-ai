/**
 * Inventory loading regression — P2 fix
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Inventory Loading — P2 Regression', () => {
  it('Inventory loading state includes table skeleton', () => {
    const content = fs.readFileSync('src/app/inventory/loading.tsx', 'utf-8');
    expect(content).toContain('table');
    expect(content).toContain('animate-pulse');
  });
});
