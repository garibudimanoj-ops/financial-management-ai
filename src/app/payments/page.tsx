import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializePayment } from '@/lib/serialize';
import Link from 'next/link';
import { CreditCard, IndianRupee, DollarSign, Wallet } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import DataTable, {
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/DataTable';

export default async function PaymentsPage() {
  const context = await requireBusinessContext();
  const canView = hasPermission(context.role, 'PAYMENTS_VIEW');

  const payments = await prisma.payment.findMany({
    where: { businessId: context.businessId },
    orderBy: { receivedAt: 'desc' },
    include: {
      customer: {
        select: { id: true, name: true },
      },
      invoice: {
        select: { id: true, invoiceNumber: true },
      },
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
    take: 100,
  });

  const serializedPayments = payments.map((p) => ({
    ...serializePayment(p),
    customer: p.customer,
    invoice: p.invoice,
    createdBy: p.createdBy,
  }));

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  });

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  const totalPayments = serializedPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'success';
      case 'CARD':
        return 'primary';
      case 'UPI':
        return 'info';
      case 'BANK_TRANSFER':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const formatMoney = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Payments & Collections"
        subtitle="Full audit trail of receipts, bank transfers, and settlements"
        icon={<CreditCard className="w-5 h-5" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Collections"
          value={formatMoney(totalPayments)}
          description={`${serializedPayments.length} recorded payments`}
          trend={{ value: 'Deposited', isPositive: true }}
          icon={currency === 'INR' ? <IndianRupee className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
          iconBg="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        />
      </div>

      {serializedPayments.length === 0 ? (
        <EmptyState
          inCard
          icon={<CreditCard className="w-8 h-8" />}
          title="No payments recorded yet"
          description="Customer receipts and settlements will populate here once transactions are recorded."
        />
      ) : (
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Date & Time</TableHeaderCell>
              <TableHeaderCell>Invoice Reference</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Payment Method</TableHeaderCell>
              <TableHeaderCell align="right">Amount</TableHeaderCell>
              <TableHeaderCell>Reference / Notes</TableHeaderCell>
              <TableHeaderCell>Recorded By</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {serializedPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="text-slate-400 text-xs">
                  {new Date(payment.receivedAt).toLocaleDateString()} {new Date(payment.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell>
                  {payment.invoiceId ? (
                    <Link
                      href={`/invoices/${payment.invoiceId}`}
                      className="font-mono text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                      #{payment.invoice?.invoiceNumber || payment.invoiceId.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-slate-200">
                  {payment.customer?.name || 'Walk-in Customer'}
                </TableCell>
                <TableCell>
                  <Badge variant={getMethodBadgeVariant(payment.paymentMethod)} size="xs">
                    {payment.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell align="right" isNumeric className="font-bold text-emerald-400">
                  {formatMoney(Number(payment.amount))}
                </TableCell>
                <TableCell className="text-xs text-slate-400 font-mono">
                  {payment.reference || '—'}
                </TableCell>
                <TableCell className="text-xs text-slate-400">
                  {payment.createdBy?.email || 'System'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
