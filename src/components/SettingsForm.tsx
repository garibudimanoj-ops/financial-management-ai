'use client';

import { useState } from 'react';
import { updateBusinessSettings } from '@/actions/business';

interface SettingsFormProps {
  business: {
    id: string;
    name: string;
    accountType: string;
    businessType: string;
    country: string;
    state: string;
    city: string;
    baseCurrency: string;
    taxRegistrationStatus: boolean;
    taxId: string | null;
  };
  canEdit: boolean;
}

export default function SettingsForm({ business, canEdit }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [taxRegistered, setTaxRegistered] = useState(business.taxRegistrationStatus);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit) return;

    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const country = formData.get('country') as string;
    const state = formData.get('state') as string;
    const city = formData.get('city') as string;
    const taxRegistrationStatus = formData.get('taxRegistrationStatus') === 'true';
    const taxId = formData.get('taxId') as string;

    try {
      await updateBusinessSettings(business.id, {
        name,
        country,
        state,
        city,
        taxRegistrationStatus,
        taxId: taxRegistrationStatus ? taxId : null,
      });
      setMessage({ text: 'Business profile updated successfully!', isError: false });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Update failed', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl text-sm border ${
            message.isError
              ? 'bg-red-900/30 border-red-500/50 text-red-200'
              : 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Business Name
          </label>
          <input
            name="name"
            type="text"
            required
            disabled={!canEdit}
            defaultValue={business.name}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Account Type
          </label>
          <input
            type="text"
            disabled
            value={business.accountType}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm opacity-60 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Base Currency
          </label>
          <input
            type="text"
            disabled
            value={business.baseCurrency}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm opacity-60 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Country
          </label>
          <input
            name="country"
            type="text"
            required
            disabled={!canEdit}
            defaultValue={business.country}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            State / Province
          </label>
          <input
            name="state"
            type="text"
            required
            disabled={!canEdit}
            defaultValue={business.state}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            City
          </label>
          <input
            name="city"
            type="text"
            required
            disabled={!canEdit}
            defaultValue={business.city}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Tax Registration Status
          </label>
          <select
            name="taxRegistrationStatus"
            disabled={!canEdit}
            value={taxRegistered ? 'true' : 'false'}
            onChange={(e) => setTaxRegistered(e.target.value === 'true')}
            className="w-full glass-input px-4 py-3 rounded-xl text-sm disabled:opacity-50"
          >
            <option value="false">Unregistered / Exempt</option>
            <option value="true">Registered (GST / VAT)</option>
          </select>
        </div>

        {taxRegistered && (
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Tax ID / GSTIN Number
            </label>
            <input
              name="taxId"
              type="text"
              required={taxRegistered}
              disabled={!canEdit}
              defaultValue={business.taxId || ''}
              placeholder="e.g. 27AAAAA0000A1Z5"
              className="w-full glass-input px-4 py-3 rounded-xl text-sm disabled:opacity-50 font-mono"
            />
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      )}
    </form>
  );
}
