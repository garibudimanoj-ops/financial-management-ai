import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializeSupplier } from '@/lib/serialize';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Truck, ArrowLeft, Edit3, Archive, RotateCcw, Phone, Mail, MapPin, Building2, FileText, DollarSign, CreditCard } from 'lucide-react';

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();
  const canManage = hasPermission(context.role, 'SUPPLIER_UPDATE');

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true, name: true },
  });

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseBills: {
        orderBy: { billDate: 'desc' },
        take: 20,
      },
      purchasePayments: {
        orderBy: { paymentDate: 'desc' },
        take: 20,
      },
      expenses: {
        orderBy: { expenseDate: 'desc' },
        take: 10,
        include: { category: { select: { name: true } } },
      },
    },
  });

  if (!supplier || supplier.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: string | number | { toString(): string } | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  const serializedSupplier = serializeSupplier(supplier);

  const totalPurchases = supplier.purchaseBills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0);
  const totalPaid = supplier.purchasePayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const currentBalance = Number(supplier.currentBalance);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">{supplier.name}</h1>
            {supplier.archived && (
              <span className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded-full font-semibold border border-red-500/30">
                Archived
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            Supplier ID: <span className="text-indigo-400 font-semibold">{supplier.id}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/suppliers"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Directory
          </Link>

          {canManage && !supplier.archived && (
            <Link
              href={`/suppliers/${supplier.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-white"
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              Edit
            </Link>
          )}

          {canManage && (
            <form action={supplier.archived ? undefined : undefined}>
              {/* Archive handled via server action */}
            </form>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Current Payable</span>
          <p className={`text-3xl font-extrabold font-mono ${currentBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {fmt(supplier.currentBalance)}
          </p>
          <span className="text-[11px] text-gray-500 block">
            {currentBalance > 0 ? 'Amount owed to supplier' : 'No outstanding balance'}
          </span>
        </div>

        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Purchases</span>
          <p className="text-3xl font-extrabold text-white font-mono">
            {fmt(totalPurchases)}
          </p>
          <span className="text-[11px] text-gray-500 block">All-time purchase volume</span>
        </div>

        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Payments Made</span>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">
            {fmt(totalPaid)}
          </p>
          <span className="text-[11px] text-gray-500 block">Payments to this supplier</span>
        </div>

        <div className="glass-card p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Open Bills</span>
          <p className="text-3xl font-extrabold text-indigo-400 font-mono">
            {supplier.purchaseBills.filter(b => b.status !== 'PAID' && b.status !== 'CANCELLED').length}
          </p>
          <span className="text-[11px] text-gray-500 block">Bills needing payment</span>
        </div>
      </div>

      {/* Contact & Details Card */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Contact & Account Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {supplier.contactPerson && (
            <div className="flex items-center gap-2 text-gray-300">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span><strong>Contact:</strong> {supplier.contactPerson}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2 text-gray-300">
              <Phone className="w-4 h-4 text-indigo-400" />
              <span className="font-mono">{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-gray-300">
              <Mail className="w-4 h-4 text-indigo-400" />
              <span>{supplier.email}</span>
            </div>
          )}
          {supplier.gstin && (
            <div className="flex items-center gap-2 text-gray-300">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="font-mono">GSTIN: {supplier.gstin}</span>
            </div>
          )}
          {supplier.pan && (
            <div className="flex items-center gap-2 text-gray-300">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="font-mono">PAN: {supplier.pan}</span>
            </div>
          )}
          {(supplier.address || supplier.city || supplier.state || supplier.pincode) && (
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>
                {supplier.address}, {supplier.city}{supplier.state ? `, ${supplier.state}` : ''} {supplier.pincode ? `- ${supplier.pincode}` : ''}
              </span>
            </div>
          )}
          {supplier.paymentTerms && (
            <div className="flex items-center gap-2 text-gray-300">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span>Terms: {supplier.paymentTerms}</span>
            </div>
          )}
          {supplier.creditLimit && (
            <div className="flex items-center gap-2 text-gray-300">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              <span>Credit Limit: {fmt(supplier.creditLimit)}</span>
            </div>
          )}
        </div>
        {supplier.notes && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-300">{supplier.notes}</p>
          </div>
        )}
      </div>

      {/* Purchase Bills Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Purchase Bills ({supplier.purchaseBills.length})
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {supplier.purchaseBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No purchase bills recorded for this supplier yet.
                    </td>
                  </tr>
                ) : (
                  supplier.purchaseBills.map((bill) => {
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
                          {bill.supplierInvoiceNumber && (
                            <span className="text-xs text-gray-400 ml-2">({bill.supplierInvoiceNumber})</span>
                          )}
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

      {/* Payments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Payments Made ({supplier.purchasePayments.length})
          </h2>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Bill</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {supplier.purchasePayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No payments recorded for this supplier yet.
                    </td>
                  </tr>
                ) : (
                  supplier.purchasePayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-white/[0.03] transition-colors text-gray-300">
                      <td className="py-3 px-4 text-xs font-mono whitespace-nowrap">
                        {new Date(payment.paymentDate).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {payment.billId ? (
                          <span className="font-mono text-indigo-400">Bill linked</span>
                        ) : (
                          <span className="text-gray-500">General payment</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {fmt(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/5 text-white">
                          {payment.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 font-mono">
                        {payment.reference || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      {supplier.expenses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Expenses ({supplier.expenses.length})
            </h2>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payee</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {supplier.expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-white/[0.03] transition-colors text-gray-300">
                      <td className="py-3 px-4 text-xs font-mono whitespace-nowrap">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-white">{expense.payeeName}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {expense.category?.name || 'Uncategorized'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {fmt(expense.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          expense.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {expense.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
