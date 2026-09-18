/* eslint-disable react-hooks/error-boundaries */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Signup — P3 Regression', () => {
  it('Signup page includes zod validation before submit', () => {
    const content = fs.readFileSync('src/app/signup/page.tsx', 'utf-8');
    expect(content).toContain('z.object');
    expect(content).toContain('safeParse');
  });
});
