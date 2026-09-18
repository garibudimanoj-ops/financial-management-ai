/**
 * POS null-guard regression — P2 fix
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('POS — P2 Regression', () => {
  it('POSTerminal defines safeFmt helper for defensive formatting', () => {
    const content = fs.readFileSync('src/components/pos/POSTerminal.tsx', 'utf-8');
    expect(content).toContain('safeFmt');
    expect(content).toContain('Number.isFinite');
  });

  it('POSTerminal uses safeFmt instead of raw toFixed', () => {
    const content = fs.readFileSync('src/components/pos/POSTerminal.tsx', 'utf-8');
    // Only the safeFmt definition should contain .toFixed
    const lines = content.split('\n');
    const toFixedLines = lines.filter((l) => l.includes('.toFixed'));
    expect(toFixedLines.length).toBeLessThanOrEqual(1); // only inside safeFmt
  });
});
