import { requireBusinessContext } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializeInvoice } from '@/lib/serialize';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Plus,
  Eye,
  RefreshCw,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

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

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-400" />
            Invoices
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage sales invoices, payments, and refunds
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>

          {canCreate && (
            <Link
              href="/pos"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              New Sale
            </Link>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {serializedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto text-gray-500 mb-2 opacity-50" />
                    <p className="font-medium text-gray-300">No invoices yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Create your first sale from the POS terminal
                    </p>
                  </td>
                </tr>
              ) : (
                serializedInvoices.map((invoice) => {
                  const totalNum = Number(invoice.totalAmount);
                  const paidNum = Number(invoice.paidAmount);
                  const balanceNum = Number(invoice.balanceDue);

                  const getStatusBadge = () => {
                    switch (invoice.status) {
                      case 'DRAFT':
                        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
                      case 'ISSUED':
                        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
                      case 'PARTIALLY_PAID':
                        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                      case 'PAID':
                        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                      case 'CANCELLED':
                        return 'bg-red-500/20 text-red-300 border-red-500/30';
                      case 'REFUNDED':
                        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                      default:
                        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
                    }
                  };

                  const getStatusIcon = () => {
                    switch (invoice.status) {
                      case 'PAID':
                        return <CheckCircle2 className="w-3.5 h-3.5" />;
                      case 'ISSUED':
                        return <Clock className="w-3.5 h-3.5" />;
                      case 'PARTIALLY_PAID':
                        return <AlertCircle className="w-3.5 h-3.5" />;
                      case 'CANCELLED':
                        return <XCircle className="w-3.5 h-3.5" />;
                      case 'REFUNDED':
                        return <RefreshCw className="w-3.5 h-3.5" />;
                      default:
                        return <Clock className="w-3.5 h-3.5" />;
                    }
                  };

                  return (
                    <tr key={invoice.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-white">{invoice.invoiceNumber}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        {invoice.customer?.name || 'Walk-in'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 font-mono">
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-300">
                        {currency === 'INR' ? '₹' : '$'}{totalNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                        {currency === 'INR' ? '₹' : '$'}{paidNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {currency === 'INR' ? '₹' : '$'}{balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge()}`}>
                          {getStatusIcon()}
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all inline-flex items-center"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
