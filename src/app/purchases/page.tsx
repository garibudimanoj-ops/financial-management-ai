import { Prisma } from '@prisma/client';
import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializePurchaseBill } from '@/lib/serialize';
import Link from 'next/link';
import { FileText, Search, Truck, Eye } from 'lucide-react';
import PurchaseBillFormModal from '@/components/purchases/PurchaseBillFormModal';
import PageHeader from '@/components/ui/PageHeader';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import DataTable, {
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '@/components/ui/DataTable';

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
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;

  const fmt = (val: string | number | null | undefined) =>
    val != null
      ? `${currencySymbol}${Number(val).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : `${currencySymbol}0.00`;

  const serializedBills = bills.map(serializePurchaseBill);

  const totalPending = bills
    .filter((b) => b.status !== 'PAID' && b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + Number(b.balanceDue), 0);

  const totalThisMonth = bills
    .filter((b) => new Date(b.billDate).getMonth() === new Date().getMonth())
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Purchase Bills & Payables"
        subtitle="Record supplier invoices, track accounts payable, and verify input tax credit"
        icon={<Truck className="w-5 h-5" />}
        actions={
          canCreate ? (
            <PurchaseBillFormModal
              businessId={context.businessId}
              suppliers={suppliers}
              products={products.map((product) => ({
                ...product,
                costPrice: product.costPrice.toString(),
                stockQuantity: product.stockQuantity.toString(),
              }))}
              currency={currency}
            />
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Outstanding"
          value={fmt(totalPending)}
          description="Amount owed to suppliers"
          trend={{ value: 'Due to vendors', isPositive: false }}
          icon={<Truck className="w-5 h-5" />}
          iconBg="bg-amber-500/10 text-amber-400 border-amber-500/20"
        />

        <MetricCard
          title="This Month's Purchases"
          value={fmt(totalThisMonth)}
          description="Total procurement volume"
          icon={<FileText className="w-5 h-5" />}
          iconBg="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
        />

        <MetricCard
          title="Open Bills"
          value={bills.filter((b) => b.status !== 'PAID' && b.status !== 'CANCELLED').length}
          description="Bills needing payment"
          icon={<FileText className="w-5 h-5" />}
          iconBg="bg-sky-500/10 text-sky-400 border-sky-500/20"
        />

        <MetricCard
          title="Total Invoices"
          value={bills.length}
          description="All purchase bills"
          icon={<FileText className="w-5 h-5" />}
          iconBg="bg-slate-800 text-slate-300 border-slate-700"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4">
        <form className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              name="search"
              type="text"
              defaultValue={search}
              placeholder="Search by bill #, supplier invoice #, or supplier name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <select
            name="status"
            defaultValue={statusFilter}
            className="px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
            defaultValue={supplierFilter}
            className="px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Bills Table */}
      {serializedBills.length === 0 ? (
        <EmptyState
          inCard
          icon={<Truck className="w-8 h-8" />}
          title="No purchase bills found"
          description={
            search || statusFilter || supplierFilter
              ? 'Try adjusting your search criteria or clear your filters.'
              : 'Create your first purchase bill to track accounts payable and stock acquisition.'
          }
        />
      ) : (
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Bill #</TableHeaderCell>
              <TableHeaderCell>Supplier</TableHeaderCell>
              <TableHeaderCell>Vendor Inv #</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell align="right">Total</TableHeaderCell>
              <TableHeaderCell align="right">Paid</TableHeaderCell>
              <TableHeaderCell align="right">Balance Due</TableHeaderCell>
              <TableHeaderCell align="center">Status</TableHeaderCell>
              <TableHeaderCell align="right">Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {serializedBills.map((bill) => {
              const totalNum = Number(bill.totalAmount);
              const paidNum = Number(bill.paidAmount);
              const balanceNum = Number(bill.balanceDue);

              return (
                <TableRow key={bill.id}>
                  <TableCell>
                    <span className="font-mono font-semibold text-slate-100">
                      {bill.billNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/suppliers/${bill.supplierId}`}
                      className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors"
                    >
                      {bill.supplier?.name || 'Unknown Supplier'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-400 font-mono text-xs">
                    {bill.supplierInvoiceNumber || '—'}
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {new Date(bill.billDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right" isNumeric className="font-medium text-slate-100">
                    {fmt(totalNum)}
                  </TableCell>
                  <TableCell align="right" isNumeric className="font-medium text-emerald-400">
                    {fmt(paidNum)}
                  </TableCell>
                  <TableCell
                    align="right"
                    isNumeric
                    className={balanceNum > 0 ? 'text-amber-300 font-bold' : 'text-slate-400'}
                  >
                    {fmt(balanceNum)}
                  </TableCell>
                  <TableCell align="center">
                    <StatusBadge status={bill.status} size="xs" />
                  </TableCell>
                  <TableCell align="right">
                    <Link
                      href={`/purchases/${bill.id}`}
                      aria-label={`View bill ${bill.billNumber}`}
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
