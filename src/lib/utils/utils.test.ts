import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { extractBusinessId } from './extractBusinessId';
import { decimalToString, decimalToNumber } from './decimalToString';
import { Prisma } from '@prisma/client';

describe('extractBusinessId', () => {
  it('extracts businessId from URL', () => {
    const request = new NextRequest('http://localhost/api/accounts?businessId=biz-1');
    const result = extractBusinessId(request);
    expect(result.businessId).toBe('biz-1');
    expect(result.useCompanyIdAlias).toBe(false);
  });

  it('extracts companyId from URL as fallback', () => {
    const request = new NextRequest('http://localhost/api/accounts?companyId=comp-1');
    const result = extractBusinessId(request);
    expect(result.businessId).toBe('comp-1');
    expect(result.useCompanyIdAlias).toBe(true);
  });

  it('returns undefined businessId when no identifier present', () => {
    const request = new NextRequest('http://localhost/api/accounts');
    const result = extractBusinessId(request);
    expect(result.businessId).toBeUndefined();
    expect(result.useCompanyIdAlias).toBe(false);
  });

  it('prefers businessId over companyId', () => {
    const request = new NextRequest('http://localhost/api/accounts?businessId=biz-1&companyId=comp-1');
    const result = extractBusinessId(request);
    expect(result.businessId).toBe('biz-1');
    expect(result.useCompanyIdAlias).toBe(false);
  });
});

describe('decimalToString', () => {
  it('converts Prisma.Decimal to string with 2 decimal places', () => {
    const d = new Prisma.Decimal('123.456');
    expect(decimalToString(d)).toBe('123.46');
  });

  it('converts whole number to string with 2 decimal places', () => {
    const d = new Prisma.Decimal('100');
    expect(decimalToString(d)).toBe('100.00');
  });

  it('returns 0.00 for null', () => {
    expect(decimalToString(null)).toBe('0.00');
  });

  it('returns 0.00 for undefined', () => {
    expect(decimalToString(undefined)).toBe('0.00');
  });

  it('converts number to string with 2 decimal places', () => {
    expect(decimalToString(123.456 as unknown as Prisma.Decimal)).toBe('123.46');
  });
});

describe('decimalToNumber', () => {
  it('converts Prisma.Decimal to number', () => {
    const d = new Prisma.Decimal('123.456');
    expect(decimalToNumber(d)).toBe(123.456);
  });

  it('returns 0 for null', () => {
    expect(decimalToNumber(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(decimalToNumber(undefined)).toBe(0);
  });
});