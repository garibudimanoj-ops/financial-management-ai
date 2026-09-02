'use client';

import { useState } from 'react';
import { createSupplierAction } from '@/actions/supplier';
import { Plus, X } from 'lucide-react';

export default function SupplierFormModal({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const contactPerson = formData.get('contactPerson') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const gstin = formData.get('gstin') as string;
    const pan = formData.get('pan') as string;
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const pincode = formData.get('pincode') as string;
    const paymentTerms = formData.get('paymentTerms') as string;
    const openingBalance = Number(formData.get('openingBalance')) || 0;

    try {
      await createSupplierAction(businessId, {
        name,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        gstin: gstin || null,
        pan: pan || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        paymentTerms: paymentTerms || 'DUE_ON_RECEIPT',
        openingBalance,
      });

      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all"
      >
        <Plus className="w-4 h-4" />
        New Supplier
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-xl p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white">Add New Supplier</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-300 font-medium mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Supplies Ltd"
                  className="w-full glass-input px-3.5 py-2.5 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">
                    Contact Person
                  </label>
                  <input
                    name="contactPerson"
                    type="text"
                    placeholder="e.g. Rajesh Mehta"
                    className="w-full glass-input px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    name="phone"
                    type="text"
                    placeholder="+91 98765 43210"
                    className="w-full glass-input px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="billing@apexsupplies.com"
                    className="w-full glass-input px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">
                    GSTIN Number
                  </label>
                  <input
                    name="gstin"
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    className="w-full glass-input px-3.5 py-2.5 rounded-lg text-sm uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">City</label>
                  <input
                    name="city"
                    type="text"
                    placeholder="Mumbai"
                    className="w-full glass-input px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">State</label>
                  <input
                    name="state"
                    type="text"
                    placeholder="Maharashtra"
                    className="w-full glass-input px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">Opening Payable</label>
                  <input
                    name="openingBalance"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                    className="w-full glass-input px-3.5 py-2.5 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
