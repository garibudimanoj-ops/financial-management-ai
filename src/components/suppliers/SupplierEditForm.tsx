'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSupplierAction, archiveSupplierAction } from '@/actions/supplier';
import { CheckCircle2, AlertCircle, Truck, ArrowLeft, Archive, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface SupplierData {
  id: string;
  businessId: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  paymentTerms?: string | null;
  creditLimit?: string | number | null;
  notes?: string | null;
  archived: boolean;
}

interface SupplierEditFormProps {
  supplier: SupplierData;
  currency: string;
}

export default function SupplierEditForm({ supplier, currency }: SupplierEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const contactPerson = (formData.get('contactPerson') as string) || null;
    const email = (formData.get('email') as string) || null;
    const phone = (formData.get('phone') as string) || null;
    const gstin = (formData.get('gstin') as string) || null;
    const pan = (formData.get('pan') as string) || null;
    const address = (formData.get('address') as string) || null;
    const city = (formData.get('city') as string) || null;
    const state = (formData.get('state') as string) || null;
    const pincode = (formData.get('pincode') as string) || null;
    const paymentTerms = (formData.get('paymentTerms') as string) || 'DUE_ON_RECEIPT';
    const creditLimit = formData.get('creditLimit') as string;
    const notes = (formData.get('notes') as string) || null;

    try {
      await updateSupplierAction(supplier.businessId, supplier.id, {
        name,
        contactPerson,
        email,
        phone,
        gstin,
        pan,
        address,
        city,
        state,
        pincode,
        paymentTerms,
        creditLimit: creditLimit ? Number(creditLimit) : null,
        notes,
      });

      router.push(`/suppliers/${supplier.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (archived: boolean) => {
    setActionLoading(supplier.id);
    try {
      await archiveSupplierAction(supplier.businessId, supplier.id, archived);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
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
            Supplier / Company Name *
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={supplier.name}
            placeholder="e.g. Apex Industrial Supplies Ltd"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Contact Person
          </label>
          <input
            name="contactPerson"
            type="text"
            defaultValue={supplier.contactPerson || ''}
            placeholder="e.g. Rajesh Mehta"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Phone / Mobile
          </label>
          <input
            name="phone"
            type="text"
            defaultValue={supplier.phone || ''}
            placeholder="+91 98765 43210"
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
            defaultValue={supplier.email || ''}
            placeholder="billing@apexsupplies.com"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            GSTIN Number
          </label>
          <input
            name="gstin"
            type="text"
            defaultValue={supplier.gstin || ''}
            placeholder="27ABCDE1234F1Z5"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono uppercase"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            PAN Number
          </label>
          <input
            name="pan"
            type="text"
            defaultValue={supplier.pan || ''}
            placeholder="ABCDE1234F"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono uppercase"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <h3 className="text-sm font-bold text-gray-300">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Street Address
            </label>
            <input
              name="address"
              type="text"
              defaultValue={supplier.address || ''}
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
              defaultValue={supplier.city || ''}
              placeholder="e.g. Mumbai"
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
              defaultValue={supplier.state || ''}
              placeholder="e.g. Maharashtra"
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Postal Code / PIN
            </label>
            <input
              name="pincode"
              type="text"
              defaultValue={supplier.pincode || ''}
              placeholder="e.g. 400001"
              className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Payment Terms & Credit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Payment Terms
          </label>
          <select
            name="paymentTerms"
            defaultValue={supplier.paymentTerms || 'DUE_ON_RECEIPT'}
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
          >
            <option value="DUE_ON_RECEIPT" className="bg-gray-900 text-white">Due on Receipt</option>
            <option value="NET_7" className="bg-gray-900 text-white">Net 7 Days</option>
            <option value="NET_15" className="bg-gray-900 text-white">Net 15 Days</option>
            <option value="NET_30" className="bg-gray-900 text-white">Net 30 Days</option>
            <option value="NET_45" className="bg-gray-900 text-white">Net 45 Days</option>
            <option value="NET_60" className="bg-gray-900 text-white">Net 60 Days</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Credit Limit ({currency === 'INR' ? '₹' : '$'})
          </label>
          <input
            name="creditLimit"
            type="number"
            min="0"
            step="0.01"
            defaultValue={supplier.creditLimit ? Number(supplier.creditLimit) : ''}
            placeholder="e.g. 50000"
            className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
          />
          <span className="text-[11px] text-gray-500 mt-1 block">
            Maximum credit limit for this supplier
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="pt-2 border-t border-white/5">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
          Notes / Remarks
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={supplier.notes || ''}
          placeholder="Payment terms, preferred discounts, supplier notes..."
          className="w-full glass-input px-4 py-2.5 rounded-xl text-sm resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <Link
          href={`/suppliers/${supplier.id}`}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleArchive(!supplier.archived)}
            disabled={actionLoading === supplier.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 ${
              supplier.archived
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {supplier.archived ? (
              <>
                <RotateCcw className="w-4 h-4" />
                Restore
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Archive
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
