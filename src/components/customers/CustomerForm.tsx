'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, updateCustomer } from '@/actions/customer';
import { CheckCircle2, AlertCircle, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CustomerData {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxId?: string | null;
  notes?: string | null;
  creditLimit?: string | number | null;
  openingBalance?: string | number | null;
}

interface CustomerFormProps {
  businessId: string;
  currency: string;
  customer?: CustomerData;
}

export default function CustomerForm({ businessId, currency, customer }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!customer?.id;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = (formData.get('email') as string) || undefined;
    const phone = (formData.get('phone') as string) || undefined;
    const address = (formData.get('address') as string) || undefined;
    const city = (formData.get('city') as string) || undefined;
    const state = (formData.get('state') as string) || undefined;
    const postalCode = (formData.get('postalCode') as string) || undefined;
    const taxId = (formData.get('taxId') as string) || undefined;
    const notes = (formData.get('notes') as string) || undefined;
    const rawCredit = formData.get('creditLimit') as string;
    const creditLimit = rawCredit ? Number(rawCredit) : undefined;
    const rawOpening = formData.get('openingBalance') as string;
    const openingBalance = rawOpening ? Number(rawOpening) : 0;

    try {
      if (isEdit && customer?.id) {
        await updateCustomer(businessId, customer.id, {
          name,
          email,
          phone,
          address,
          city,
          state,
          postalCode,
          taxId,
          notes,
          creditLimit,
        });
        router.push(`/customers/${customer.id}`);
      } else {
        const created = await createCustomer(businessId, {
          name,
          email,
          phone,
          address,
          city,
          state,
          postalCode,
          taxId,
          notes,
          creditLimit,
          openingBalance,
        });
        router.push(`/customers/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-900/30 border border-red-500/50 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Basic Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Customer / Business Name *
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={customer?.name || ''}
            placeholder="e.g. Acme Corporation or Rahul Sharma"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Phone Number
          </label>
          <input
            name="phone"
            type="text"
            defaultValue={customer?.phone || ''}
            placeholder="e.g. +91 9876543210"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            defaultValue={customer?.email || ''}
            placeholder="e.g. billing@acmecorp.com"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            GSTIN / Tax ID
          </label>
          <input
            name="taxId"
            type="text"
            defaultValue={customer?.taxId || ''}
            placeholder="e.g. 29AAAAA0000A1Z5"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <h3 className="text-sm font-bold text-gray-300">Billing Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Street Address
            </label>
            <input
              name="address"
              type="text"
              defaultValue={customer?.address || ''}
              placeholder="e.g. 42 MG Road, Indiranagar"
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              City
            </label>
            <input
              name="city"
              type="text"
              defaultValue={customer?.city || ''}
              placeholder="e.g. Bengaluru"
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              State / Province
            </label>
            <input
              name="state"
              type="text"
              defaultValue={customer?.state || ''}
              placeholder="e.g. Karnataka"
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Postal Code / PIN
            </label>
            <input
              name="postalCode"
              type="text"
              defaultValue={customer?.postalCode || ''}
              placeholder="e.g. 560038"
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Financial Limits & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Credit Limit ({currency === 'INR' ? '₹' : '$'})
          </label>
          <input
            name="creditLimit"
            type="number"
            min="0"
            step="0.01"
            defaultValue={customer?.creditLimit ? Number(customer.creditLimit) : ''}
            placeholder="e.g. 50000"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
          />
          <span className="text-[11px] text-gray-500 mt-1 block">
            Maximum outstanding credit balance allowed for POS/Invoices
          </span>
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Opening Balance ({currency === 'INR' ? '₹' : '$'})
            </label>
            <input
              name="openingBalance"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              placeholder="0.00"
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
            />
            <span className="text-[11px] text-gray-500 mt-1 block">
              Initial outstanding balance recorded into immutable ledger
            </span>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Notes / Remarks
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={customer?.notes || ''}
            placeholder="Payment terms, preferential discounts, customer notes..."
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Submit Controls */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/10">
        <Link
          href={isEdit && customer?.id ? `/customers/${customer.id}` : '/customers'}
          className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {loading ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  );
}
