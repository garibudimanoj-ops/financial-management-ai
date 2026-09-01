import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function decimalToString(val: Prisma.Decimal | null | undefined): string {
  if (val === null || val === undefined) return '0.00';
  return val.toFixed(2);
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireBusinessContext();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'invoices';

    let csv = '';
    let filename = '';

    switch (type) {
      case 'invoices': {
        const invoices = await prisma.invoice.findMany({
          where: { businessId: context.businessId },
          include: {
            customer: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = 'Invoice Number,Date,Customer,Status,Subtotal,Tax,Discount,Total,Paid,Balance\n';
        for (const inv of invoices) {
          csv += [
            escapeCSV(inv.invoiceNumber),
            escapeCSV(inv.issueDate.toISOString().split('T')[0]),
            escapeCSV(inv.customer?.name || 'Walk-in'),
            escapeCSV(inv.status),
            decimalToString(inv.subtotal),
            decimalToString(inv.taxAmount),
            decimalToString(inv.discountAmount),
            decimalToString(inv.totalAmount),
            decimalToString(inv.paidAmount),
            decimalToString(inv.balanceDue),
          ].join(',') + '\n';
        }
        filename = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'products': {
        const products = await prisma.product.findMany({
          where: { businessId: context.businessId, archived: false },
          orderBy: { name: 'asc' },
        });
        csv = 'Name,SKU,Barcode,Category,Unit,Cost Price,Selling Price,Stock,Low Stock Threshold,Tax Category\n';
        for (const p of products) {
          csv += [
            escapeCSV(p.name),
            escapeCSV(p.SKU),
            escapeCSV(p.barcode),
            escapeCSV(p.category),
            escapeCSV(p.unit),
            decimalToString(p.costPrice),
            decimalToString(p.sellingPrice),
            decimalToString(p.stockQuantity),
            decimalToString(p.lowStockThreshold),
            escapeCSV(p.taxCategory),
          ].join(',') + '\n';
        }
        filename = `products-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'customers': {
        const customers = await prisma.customer.findMany({
          where: { businessId: context.businessId, archived: false },
          orderBy: { name: 'asc' },
        });
        csv = 'Name,Email,Phone,City,State,Country,GSTIN,Current Balance,Credit Limit\n';
        for (const c of customers) {
          csv += [
            escapeCSV(c.name),
            escapeCSV(c.email),
            escapeCSV(c.phone),
            escapeCSV(c.city),
            escapeCSV(c.state),
            escapeCSV(c.country),
            escapeCSV(c.taxId),
            decimalToString(c.currentBalance),
            c.creditLimit ? decimalToString(c.creditLimit) : '',
          ].join(',') + '\n';
        }
        filename = `customers-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      case 'payments': {
        const payments = await prisma.payment.findMany({
          where: { businessId: context.businessId },
          include: {
            customer: { select: { name: true } },
            invoice: { select: { invoiceNumber: true } },
          },
          orderBy: { receivedAt: 'desc' },
        });
        csv = 'Date,Customer,Invoice,Method,Amount,Reference,Notes\n';
        for (const p of payments) {
          csv += [
            escapeCSV(p.receivedAt.toISOString().split('T')[0]),
            escapeCSV(p.customer?.name || 'Walk-in'),
            escapeCSV(p.invoice?.invoiceNumber || ''),
            escapeCSV(p.paymentMethod),
            decimalToString(p.amount),
            escapeCSV(p.reference),
            escapeCSV(p.notes),
          ].join(',') + '\n';
        }
        filename = `payments-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }
      default:
        return new NextResponse('Invalid export type', { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return new NextResponse('Export failed', { status: 500 });
  }
}
