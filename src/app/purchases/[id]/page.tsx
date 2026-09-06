import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serializePurchaseBill } from '@/lib/serialize';
import { receiveAndPostPurchaseBillFormAction, recordPurchasePaymentFormAction, cancelPurchaseBillFormAction } from '@/actions/purchase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, RefreshCw, XCircle, CheckCircle2, Clock, AlertCircle, CreditCard, Send, DollarSign, Trash2, FileText, PackagePlus } from 'lucide-react';

interface PurchaseBillDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseBillDetailPage({ params }: PurchaseBillDetailPageProps) {
  const { id } = await params;
  const context = await requireBusinessContext();
  const canPost = hasPermission(context.role, 'PURCHASE_POST');
  const canPay = hasPermission(context.role, 'PURCHASE_PAY');
  const canCancel = hasPermission(context.role, 'PURCHASE_CANCEL');

  const business = await prisma.business.findUnique({
    where: { id: context.businessId },
    select: { baseCurrency: true },
  });

  const bill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: {
      supplier: {
        select: { id: true, name: true, email: true, phone: true, gstin: true },
      },
      items: true,
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (!bill || bill.businessId !== context.businessId) {
    notFound();
  }

  const currency = business?.baseCurrency || 'INR';
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const fmt = (val: string | number | null | undefined) =>
    val != null ? `${currencySymbol}${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${currencySymbol}0.00`;

  const serializedBill = serializePurchaseBill(bill);

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
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">
              Bill #{bill.billNumber}
            </h1>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge()}`}>
              {bill.status}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            {bill.supplier?.name || 'Unknown Supplier'} • {new Date(bill.billDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/purchases"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-all text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Purchase Bills
          </Link>

          {bill.status === 'DRAFT' && canPost && (
            <form action={receiveAndPostPurchaseBillFormAction.bind(null, context.businessId, bill.id)}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                Receive & Post
              </button>
            </form>
          )}

          {(bill.status === 'RECEIVED' || bill.status === 'PARTIALLY_PAID') && canPay && Number(bill.balanceDue) > 0 && (
            <Link
              href={`/purchases/${bill.id}/pay`}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
            >
              <DollarSign className="w-4 h-4" />
              Record Payment
            </Link>
          )}

          {canCancel && bill.status !== 'CANCELLED' && bill.status !== 'PAID' && bill.paidAmount.equals(0) && (
            <form action={cancelPurchaseBillFormAction.bind(null, context.businessId, bill.id, 'Cancelled by user')}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
                onClick={(e) => { if (!confirm('Are you sure you want to cancel this purchase bill? This will reverse inventory and supplier balance.')) e.preventDefault(); }}
              >
                <XCircle className="w-4 h-4" />
                Cancel Bill
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Bill Details Card */}
      <div className="glass-card p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Supplier</h3>
            {bill.supplier ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-white">{bill.supplier.name}</p>
                {bill.supplier.email && <p className="text-gray-400">{bill.supplier.email}</p>}
                {bill.supplier.phone && <p className="text-gray-400 font-mono">{bill.supplier.phone}</p>}
                {bill.supplier.gstin && <p className="text-gray-400 font-mono">GSTIN: {bill.supplier.gstin}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Unknown Supplier</p>
            )}
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Bill Date</span>
              <span className="text-white font-mono">{new Date(bill.billDate).toLocaleDateString()}</span>
            </div>
            {bill.dueDate && (
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Due Date</span>
                <span className="text-white font-mono">{new Date(bill.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            {bill.supplierInvoiceNumber && (
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Supplier Invoice #</span>
                <span className="text-white font-mono">{bill.supplierInvoiceNumber}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Created By</span>
              <span className="text-white font-mono">{bill.createdBy?.email || 'System'}</span>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold">
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Cost</th>
                  <th className="py-2 px-3 text-right">Discount</th>
                  <th className="py-2 px-3 text-right">Tax</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bill.items.map((item) => (
                  <tr key={item.id} className="text-gray-300">
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-white">{item.productNameSnapshot}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.skuSnapshot || '—'}</p>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{Number(item.quantity).toLocaleString()} {item.unitSnapshot}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{currencySymbol}{Number(item.unitCost).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-red-300">{currencySymbol}{Number(item.discount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300">{Number(item.taxRate)}%</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {currencySymbol}{Number(item.lineTotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Tax Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Subtotal</span>
              <span className="font-mono">{fmt(serializedBill.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Discount</span>
              <span className="font-mono text-red-300">-{fmt(serializedBill.discountAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Taxable Amount</span>
              <span className="font-mono">{fmt(Number(serializedBill.subtotal) - Number(serializedBill.discountAmount))}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>CGST</span>
              <span className="font-mono text-amber-300">{fmt(serializedBill.cgstAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>SGST</span>
              <span className="font-mono text-amber-300">{fmt(serializedBill.sgstAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>IGST</span>
              <span className="font-mono text-amber-300">{fmt(serializedBill.igstAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Total Tax</span>
              <span className="font-mono text-amber-300">{fmt(serializedBill.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="font-mono">{fmt(serializedBill.totalAmount)}</span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Summary</h3>
            <div className="flex justify-between text-sm text-emerald-400">
              <span>Paid</span>
              <span className="font-mono">{fmt(serializedBill.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white">
              <span>Balance Due</span>
              <span className="font-mono">{fmt(serializedBill.balanceDue)}</span>
            </div>
            <div className="flex justify-between text-xs text-emerald-400">
              <span>GST Input Tax Credit (ITC)</span>
              <span className="font-mono">{fmt(serializedBill.taxAmount)}</span>
            </div>
          </div>
        </div>

        {/* Record Payment Form */}
        {(bill.status === 'RECEIVED' || bill.status === 'PARTIALLY_PAID') && canPay && Number(bill.balanceDue) > 0 && (
          <form action={recordPurchasePaymentFormAction.bind(null, context.businessId, bill.id, bill.supplierId)} className="border-t border-white/10 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Record Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="hidden" name="billId" value={bill.id} />
              <input type="hidden" name="supplierId" value={bill.supplierId} />
              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount ({currencySymbol})</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(bill.balanceDue)}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-mono"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Method</label>
                <select
                  name="paymentMethod"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date</label>
                <input
                  name="paymentDate"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Payments History */}
        {bill.payments.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment History</h3>
            <div className="space-y-2">
              {bill.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-sm">
                  <div>
                    <p className="font-medium text-white">{payment.paymentMethod}</p>
                    <p className="text-xs text-gray-400">{new Date(payment.paymentDate).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400 font-mono">
                      {currencySymbol}{Number(payment.amount).toFixed(2)}
                    </p>
                    {payment.reference && (
                      <p className="text-xs text-gray-400 font-mono">Ref: {payment.reference}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bill.notes && (
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-sm text-gray-300">{bill.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
