import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  prisma: {
    invoice: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
    customer: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/auth', () => ({
  requirePermission: mocks.requirePermission,
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));

import { GET } from './route';

function request(url: string) {
  return new NextRequest(url);
}

describe('CSV export formula injection protection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requirePermission.mockResolvedValue({
      userId: 'user-own',
      userEmail: 'owner@example.com',
      supabaseUserId: 'supabase-own',
      businessId: 'business-own',
      role: 'OWNER' as const,
      membershipStatus: 'ACTIVE',
    });
  });

  it('escapes values starting with = to prevent formula injection', async () => {
    mocks.prisma.invoice.findMany.mockResolvedValue([
      {
        invoiceNumber: '=CMD|sh /c malicious',
        issueDate: new Date('2026-01-01'),
        customer: { name: 'Safe Customer' },
        status: 'PAID',
        subtotal: new Prisma.Decimal('100.00'),
        taxAmount: new Prisma.Decimal('18.00'),
        discountAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('118.00'),
        paidAmount: new Prisma.Decimal('118.00'),
        balanceDue: new Prisma.Decimal('0.00'),
      },
    ]);

    const response = await GET(request('http://localhost/api/reports/export?type=invoices'));
    const csv = await response.text();

    // The value should be tab-prefixed to prevent formula injection
    expect(csv).toContain('\t=CMD|sh /c malicious');
    // And it should NOT start with = (meaning it's properly escaped)
    expect(csv.split('\n')[1].split(',')[0].startsWith('=')).toBe(false);
  });

  it('escapes values starting with + to prevent formula injection', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        name: '+SUM(A1:A100)',
        SKU: 'SKU-001',
        barcode: '123456',
        category: 'Test',
        unit: 'pcs',
        costPrice: new Prisma.Decimal('10.00'),
        sellingPrice: new Prisma.Decimal('20.00'),
        stockQuantity: new Prisma.Decimal('100'),
        lowStockThreshold: new Prisma.Decimal('10'),
        taxCategory: 'Standard',
      },
    ]);

    const response = await GET(request('http://localhost/api/reports/export?type=products'));
    const csv = await response.text();

    expect(csv).toContain('\t+SUM(A1:A100)');
  });

  it('escapes values starting with - to prevent formula injection', async () => {
    mocks.prisma.customer.findMany.mockResolvedValue([
      {
        name: '-5000',
        email: 'safe@example.com',
        phone: '1234567890',
        city: 'Test',
        state: 'TS',
        country: 'IN',
        taxId: '',
        currentBalance: new Prisma.Decimal('100.00'),
        creditLimit: null,
      },
    ]);

    const response = await GET(request('http://localhost/api/reports/export?type=customers'));
    const csv = await response.text();

    expect(csv).toContain('\t-5000');
  });

  it('escapes values starting with @ to prevent formula injection', async () => {
    mocks.prisma.payment.findMany.mockResolvedValue([
      {
        receivedAt: new Date('2026-01-01'),
        customer: { name: 'Safe' },
        invoice: { invoiceNumber: 'INV-001' },
        paymentMethod: '@import',
        amount: new Prisma.Decimal('100.00'),
        reference: 'ref',
        notes: '',
      },
    ]);

    const response = await GET(request('http://localhost/api/reports/export?type=payments'));
    const csv = await response.text();

    expect(csv).toContain('\t@import');
  });
});