import { Prisma } from '@prisma/client';
import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializePurchaseBill } from '@/lib/serialize';
import Link from 'next/link';
import { FileText, ArrowLeft, Plus, Search, Filter, DollarSign, Calendar, Clock } from 'lucide-react';
import PurchaseBillFormModal from '@/components/purchases/PurchaseBillFormModal';

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; supplier?: string }>;
}) {
  const context = await requireBusinessContext();
  const canCreate = hasPermission(context.role, 'PURCHASE_CREATE');
  const params = await searchParams;
  const search = params.search || '';
  const statusFilter = params.status || '';
  const supplierFilter = params.supplier || '';

  const [business, suppliers, products] = await Promise.all([
    prisma.business.findUnique({
      where: { id: context.businessId },
      select: { baseCurrency: true },
    }),
    prisma.supplier.findMany({
      where: { businessId: context.businessId, archived: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { businessId: context.businessId, archived: false },
      select: { id: true, name: true, SKU: true, costPrice: true, stockQuantity: true, unit: true, taxCategory: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const where: Prisma.PurchaseBillWhereInput = {
    businessId: context.businessId,
    ...(search.trim() !== ''
      ? {
          OR: [
            { billNumber: { contains: search.trim(), mode: 'insensitive' } },
            { supplierInvoiceNumber: { contains: search.trim(), mode: 'insensitive' } },
            { supplier: { name: { contains: search.trim(), mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(statusFilter ? { status: statusFilter as import('@prisma/client').PurchaseBillStatus } : {}),
    ...(supplierFilter ? { supplierId: supplierFilter } : {}),
  };

  const bills = await prisma.purchaseBill.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, email: true, phone: true, gstin: true } },
      payments: true,
    },
    orderBy: { billDate: 'desc' },
  });

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: string | number | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  const serializedBills = bills.map(serializePurchaseBill);

  const totalPending = bills.filter(b => b.status !== 'PAID' && b.status !== 'CANCELLED').reduce((sum, b) => sum + Number(b.balanceDue), 0);
  const totalThisMonth = bills.filter(b => new Date(b.billDate).getMonth() === new Date().getMonth()).reduce((sum, b) => sum + Number(b.totalAmount), 0);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-400" />
            Purchase Bills
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Record supplier invoices, track accounts payable, and manage GST Input Tax Credit
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

          {canCreate && <PurchaseBillFormModal businessId={context.businessId} suppliers={suppliers} products={products.map((product) => ({ ...product, costPrice: product.costPrice.toString(), stockQuantity: product.stockQuantity.toString() }))} currency={currency} />}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Outstanding</span>
          <p className="text-3xl font-extrabold text-amber-400 font-mono">{fmt(totalPending)}</p>
          <span className="text-[11px] text-gray-500 block">Amount owed to suppliers</span>
        </div>

        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">This Month&apos;s Purchases</span>
          <p className="text-3xl font-extrabold text-indigo-400 font-mono">{fmt(totalThisMonth)}</p>
          <span className="text-[11px] text-gray-500 block">Total purchase volume</span>
        </div>

        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Open Bills</span>
          <p className="text-3xl font-extrabold text-indigo-400 font-mono">
            {bills.filter(b => b.status !== 'PAID' && b.status !== 'CANCELLED').length}
          </p>
          <span className="text-[11px] text-gray-500 block">Bills needing payment</span>
        </div>

        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Bills</span>
          <p className="text-3xl font-extrabold text-white font-mono">{bills.length}</p>
          <span className="text-[11px] text-gray-500 block">All purchase bills</span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <form className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                name="search"
                type="text"
                value={search}
                placeholder="Search by bill #, supplier invoice #, or supplier name..."
                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
              />
            </div>

            <select
              name="status"
              value={statusFilter}
              className="w-full sm:w-48 glass-input px-4 py-2.5 rounded-xl text-sm"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="RECEIVED">Received</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              name="supplier"
              value={supplierFilter}
              className="w-full sm:w-56 glass-input px-4 py-2.5 rounded-xl text-sm"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Bills Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                <th className="py-3.5 px-4">Bill #</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Supplier Inv #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {serializedBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto text-gray-500 mb-2 opacity-50" />
                    <p className="font-medium text-gray-300">No purchase bills found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {search || statusFilter || supplierFilter
                        ? 'Try adjusting your search filters'
                        : 'Create your first purchase bill to start tracking accounts payable'}
                    </p>
                  </td>
                </tr>
              ) : (
                serializedBills.map((bill) => {
                  const totalNum = Number(bill.totalAmount);
                  const paidNum = Number(bill.paidAmount);
                  const balanceNum = Number(bill.balanceDue);

                  const getStatusBadge = () => {
                    switch (bill.status) {
                      case 'DRAFT':
                        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
                      case 'RECEIVED':
                        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
                      case 'PARTIALLY_PAID':
                        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                      case 'PAID':
                        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                      case 'CANCELLED':
                        return 'bg-red-500/20 text-red-300 border-red-500/30';
                      default:
                        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
                    }
                  };

                  return (
                    <tr key={bill.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-white">{bill.billNumber}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/suppliers/${bill.supplierId}`}
                          className="text-indigo-400 hover:underline font-medium text-sm"
                        >
                          {bill.supplier?.name || 'Unknown Supplier'}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-xs">
                        {bill.supplierInvoiceNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 font-mono">
                        {new Date(bill.billDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-300">
                        {fmt(totalNum)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                        {fmt(paidNum)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {fmt(balanceNum)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge()}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/purchases/${bill.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-all inline-flex items-center"
                        >
                          View
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    case 'RECEIVED':
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    case 'PARTIALLY_PAID':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'PAID':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'CANCELLED':
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}
