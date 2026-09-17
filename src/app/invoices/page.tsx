import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeInvoice } from '@/lib/serialize';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Eye,
  ShoppingCart,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import DataTable, {
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/DataTable';

export default async function InvoicesPage() {
  const context = await requireBusinessContext();
  const canCreate = hasPermission(context.role, 'INVOICE_CREATE');

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  });

  const invoices = await prisma.invoice.findMany({
    where: { businessId: context.businessId },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      items: true,
      payments: true,
    },
  });

  const serializedInvoices = invoices.map(serializeInvoice);
  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  const formatMoney = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Invoices & Billing"
        subtitle="Manage sales invoices, customer credit, and payment status"
        icon={<FileText className="w-5 h-5" />}
        actions={
          canCreate ? (
            <div className="flex items-center gap-2.5">
              <Link href="/pos">
                <Button variant="secondary" size="sm" icon={<ShoppingCart className="w-4 h-4" />}>
                  POS Counter
                </Button>
              </Link>
              <Link href="/pos">
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                  New Sale
                </Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {serializedInvoices.length === 0 ? (
        <EmptyState
          inCard
          icon={<FileText className="w-8 h-8" />}
          title="No invoices generated yet"
          description="Create your first customer sale or counter transaction to start populating your sales ledger."
          action={
            canCreate ? (
              <Link href="/pos">
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Start First Sale
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Invoice #</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell align="right">Total</TableHeaderCell>
              <TableHeaderCell align="right">Paid</TableHeaderCell>
              <TableHeaderCell align="right">Balance Due</TableHeaderCell>
              <TableHeaderCell align="center">Status</TableHeaderCell>
              <TableHeaderCell align="right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {serializedInvoices.map((invoice) => {
              const totalNum = Number(invoice.totalAmount);
              const paidNum = Number(invoice.paidAmount);
              const balanceNum = Number(invoice.balanceDue);

              return (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <span className="font-mono font-semibold text-slate-100">
                      {invoice.invoiceNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-200">
                      {invoice.customer?.name || 'Walk-in Customer'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right" isNumeric className="text-slate-200 font-medium">
                    {formatMoney(totalNum)}
                  </TableCell>
                  <TableCell align="right" isNumeric className="text-emerald-400 font-medium">
                    {formatMoney(paidNum)}
                  </TableCell>
                  <TableCell
                    align="right"
                    isNumeric
                    className={balanceNum > 0 ? 'text-amber-300 font-bold' : 'text-slate-400'}
                  >
                    {formatMoney(balanceNum)}
                  </TableCell>
                  <TableCell align="center">
                    <StatusBadge status={invoice.status} size="xs" />
                  </TableCell>
                  <TableCell align="right">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      aria-label={`View invoice ${invoice.invoiceNumber}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors inline-flex items-center"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
