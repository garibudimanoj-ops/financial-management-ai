import { describe, expect, it } from 'vitest';
import { getSafeAuthRedirect } from './authRedirect';

describe('getSafeAuthRedirect', () => {
  const siteOrigin = 'https://financial.example';

  it.each([
    ['/dashboard', '/dashboard'],
    ['/reset-password?token=abc', '/reset-password?token=abc'],
    ['//attacker.example/path', '/'],
    ['/\\\\attacker.example/path', '/'],
    ['https://attacker.example/path', '/'],
    [null, '/'],
  ])('validates redirect candidate %s', (candidate, expected) => {
    expect(getSafeAuthRedirect(candidate, siteOrigin)).toBe(expected);
  });
});
