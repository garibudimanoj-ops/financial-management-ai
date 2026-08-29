'use client';

import { useState } from 'react';
import { issueInvoiceAction, refundInvoiceAction } from '@/actions/invoice';
import { recordPaymentAction } from '@/actions/payment';
import { serializeInvoice, serializePayment } from '@/lib/serialize';
import { Prisma } from '@prisma/client';
import { CheckCircle2, RefreshCw, XCircle, Clock, AlertCircle, Send, CreditCard } from 'lucide-react';

interface Invoice {
  id: string;
  businessId: string;
  customerId: string | null;
  invoiceNumber: string;
  status: string;
  issueDate: Date | string;
  dueDate: Date | string | null;
  subtotal: string | number | null;
  discountAmount: string | number | null;
  taxAmount: string | number | null;
  totalAmount: string | number | null;
  paidAmount: string | number | null;
  balanceDue: string | number | null;
  notes: string | null;
  createdById: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items: {
    id: string;
    invoiceId: string;
    productId: string | null;
    productNameSnapshot: string;
    skuSnapshot: string;
    unitSnapshot: string;
    quantity: string | number | null;
    unitPrice: string | number | null;
    unitCostSnapshot: string | number | null;
    discount: string | number | null;
    taxRate: string | number | null;
    taxAmount: string | number | null;
    lineSubtotal: string | number | null;
    lineTotal: string | number | null;
  }[];
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone?: string | null;
  } | null;
  payments: {
    id: string;
    businessId: string;
    invoiceId: string | null;
    customerId: string | null;
    amount: string | number | null;
    paymentMethod: string;
    reference: string | null;
    notes: string | null;
    receivedAt: string | Date;
    createdById: string | null;
    createdAt: string | Date;
  }[];
  createdBy: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

interface InvoiceActionsProps {
  businessId: string;
  invoice: Invoice;
  currency: string;
  currencySymbol: string;
}

export default function InvoiceActions({ businessId, invoice, currency, currencySymbol }: InvoiceActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const canIssue = invoice.status === 'DRAFT';
  const canRefund = invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && invoice.status !== 'REFUNDED';
  const canPay = invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID';
  const balanceDue = Number(invoice.balanceDue);

  const handleIssue = async () => {
    setLoading(true);
    setError(null);
    try {
      await issueInvoiceAction(businessId, invoice.id);
      setSuccess('Invoice issued successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!confirm('Are you sure you want to refund this invoice? Stock will be returned to inventory if applicable.')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await refundInvoiceAction(businessId, {
        invoiceId: invoice.id,
        returnStockToInventory: true,
        reason: 'Customer refund request',
      });
      setSuccess('Invoice refunded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refund invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amount = Number(paymentAmount);
    if (amount <= 0 || amount > balanceDue) {
      setError(`Payment must be between 0.01 and ${balanceDue.toFixed(2)}`);
      setLoading(false);
      return;
    }

    try {
      await recordPaymentAction(businessId, {
        invoiceId: invoice.id,
        amount,
        paymentMethod: paymentMethod as any,
        reference: paymentReference || null,
        idempotencyKey: `payment-${invoice.id}-${Date.now()}`,
      });
      setSuccess('Payment recorded successfully');
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentReference('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Invoice Details Card */}
      <div className="glass-card p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bill To</h3>
            {invoice.customer ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-white">{invoice.customer.name}</p>
                {invoice.customer.email && <p className="text-gray-400">{invoice.customer.email}</p>}
                {invoice.customer.phone && <p className="text-gray-400 font-mono">{invoice.customer.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Walk-in Customer</p>
            )}
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Issue Date</span>
              <span className="text-white font-mono">{new Date(invoice.issueDate).toLocaleDateString()}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Due Date</span>
                <span className="text-white font-mono">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Created By</span>
              <span className="text-white font-mono">{invoice.createdBy?.email || 'System'}</span>
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
                  <th className="py-2 px-3 text-right">Unit Price</th>
                  <th className="py-2 px-3 text-right">Discount</th>
                  <th className="py-2 px-3 text-right">Tax</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="text-gray-300">
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-white">{item.productNameSnapshot}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.skuSnapshot}</p>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{Number(item.quantity).toLocaleString()} {item.unitSnapshot}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{currencySymbol}{Number(item.unitPrice).toFixed(2)}</td>
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

        {/* Totals */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-300">
            <span>Subtotal</span>
            <span className="font-mono">{currencySymbol}{Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-300">
            <span>Discount</span>
            <span className="font-mono text-red-300">-{currencySymbol}{Number(invoice.discountAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-300">
            <span>Tax</span>
            <span className="font-mono text-amber-300">{currencySymbol}{Number(invoice.taxAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
            <span>Total</span>
            <span className="font-mono">{currencySymbol}{Number(invoice.totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-emerald-400">
            <span>Paid</span>
            <span className="font-mono">{currencySymbol}{Number(invoice.paidAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-white">
            <span>Balance Due</span>
            <span className="font-mono">{currencySymbol}{Number(invoice.balanceDue).toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
          {canIssue && (
            <button
              onClick={handleIssue}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Issue Invoice
            </button>
          )}

          {canRefund && (
            <button
              onClick={handleRefund}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refund
            </button>
          )}

          {canPay && balanceDue > 0 && (
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
          )}
        </div>

        {/* Payment Form */}
        {showPaymentForm && (
          <form onSubmit={handlePayment} className="border-t border-white/10 pt-4 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Record Payment</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-mono"
                  placeholder="0.00"
                  min="0.01"
                  max={balanceDue}
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
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
                <label className="block text-xs text-gray-400 mb-1">Reference</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm"
                  placeholder="Ref #"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Payments History */}
        {invoice.payments.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment History</h3>
            <div className="space-y-2">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-sm">
                  <div>
                    <p className="font-medium text-white">{payment.paymentMethod}</p>
                    <p className="text-xs text-gray-400">{new Date(payment.receivedAt).toLocaleString()}</p>
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

        {invoice.notes && (
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-sm text-gray-300">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
