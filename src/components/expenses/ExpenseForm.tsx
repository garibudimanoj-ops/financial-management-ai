'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createExpenseAction } from '@/actions/expense';
import Link from 'next/link';
import { DollarSign, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExpenseFormProps {
  businessId: string;
  currency: string;
  accounts: Array<{ id: string; code: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
}

export default function ExpenseForm({ businessId, currency, accounts, categories, suppliers }: ExpenseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const expense = await createExpenseAction(businessId, {
        accountId: formData.get('accountId') as string,
        categoryId: (formData.get('categoryId') as string) || null,
        supplierId: (formData.get('supplierId') as string) || null,
        payeeName: (formData.get('payeeName') as string) || '',
        amount: Number(formData.get('amount')),
        taxRate: Number(formData.get('taxRate') || 0),
        paymentMethod: (formData.get('paymentMethod') as 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER') || 'BANK_TRANSFER',
        expenseDate: (formData.get('expenseDate') as string) || null,
        reference: (formData.get('reference') as string) || null,
        receiptUrl: (formData.get('receiptUrl') as string) || null,
        notes: (formData.get('notes') as string) || null,
      });

      setSuccess(`Expense #${expense.expenseNumber} recorded successfully.`);
      router.push('/expenses');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Payee / Vendor Name *
          </label>
          <input
            name="payeeName"
            type="text"
            required
            placeholder="e.g. Office Depot, Mumbai Office Rent"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Expense Account *
          </label>
          <select
            name="accountId"
            required
            className="w-full glass-input px-4 py-3 rounded-xl text-sm bg-[#0f111a]"
          >
            <option value="">Select expense account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} — {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Category
          </label>
          <select
            name="categoryId"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm bg-[#0f111a]"
          >
            <option value="">Uncategorized</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Supplier
          </label>
          <select
            name="supplierId"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm bg-[#0f111a]"
          >
            <option value="">No supplier</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Amount ({currencySymbol}) *
          </label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Tax Rate (%)
          </label>
          <input
            name="taxRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            placeholder="0"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Payment Method *
          </label>
          <select
            name="paymentMethod"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm bg-[#0f111a]"
          >
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="UPI">UPI</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Expense Date
          </label>
          <input
            name="expenseDate"
            type="date"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Reference
          </label>
          <input
            name="reference"
            type="text"
            placeholder="e.g. Receipt #4521"
            className="w-full glass-input px-4 py-3 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Receipt URL
          </label>
          <input
            name="receiptUrl"
            type="text"
            placeholder="https://..."
            className="w-full glass-input px-4 py-3 rounded-xl text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Optional expense notes"
          className="w-full glass-input px-4 py-3 rounded-xl text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/10">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
        >
          {loading ? 'Recording...' : 'Record Expense'}
        </button>
        <Link
          href="/expenses"
          className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}