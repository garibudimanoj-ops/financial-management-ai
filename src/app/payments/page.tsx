import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializePayment } from '@/lib/serialize';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Calendar, IndianRupee } from 'lucide-react';

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
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const totalPayments = serializedPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'CARD':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'UPI':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'BANK_TRANSFER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-emerald-400" />
            Payments
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Payment history and reconciliation
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      {/* KPI Card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <IndianRupee className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Payments Received</p>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono">
              {currencySymbol}{totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Invoice</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {serializedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <CreditCard className="w-10 h-10 mx-auto text-gray-500 mb-2 opacity-50" />
                    <p className="font-medium text-gray-300">No payments recorded yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Payments will appear here after checkout or manual recording
                    </p>
                  </td>
                </tr>
              ) : (
                serializedPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 text-xs text-gray-400 font-mono whitespace-nowrap">
                      {new Date(payment.receivedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {payment.invoiceId ? (
                        <Link
                          href={`/invoices/${payment.invoiceId}`}
                          className="font-mono text-indigo-400 hover:underline"
                        >
                          #{payment.invoice?.invoiceNumber || payment.invoiceId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300">
                      {payment.customer?.name || 'Walk-in'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getMethodBadge(payment.paymentMethod)}`}>
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {currencySymbol}{Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400 font-mono">
                      {payment.reference || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {payment.createdBy?.email || 'System'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
