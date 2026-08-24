'use client';

import { useState } from 'react';
import { onboardBusiness } from '@/actions/business';

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasTaxId, setHasTaxId] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const accountType = formData.get('accountType') as string;
    const businessType = formData.get('businessType') as string;
    const country = formData.get('country') as string;
    const state = formData.get('state') as string;
    const city = formData.get('city') as string;
    const baseCurrency = formData.get('baseCurrency') as string;
    const fiscalYearStart = formData.get('fiscalYearStart') as string;
    const taxRegistrationStatus = formData.get('taxRegistrationStatus') === 'true';
    const taxId = formData.get('taxId') as string;

    try {
      await onboardBusiness({
        name,
        accountType,
        businessType,
        country,
        state,
        city,
        baseCurrency,
        fiscalYearStart,
        taxRegistrationStatus,
        taxId: taxRegistrationStatus ? taxId : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-height-screen items-center justify-center p-6 md:p-12">
      <div className="glass-card w-full max-w-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Onboard Your Business
          </h1>
          <p className="text-sm text-gray-400 mt-2">Initialize your business profile and compliance details</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Business Name</label>
            <input
              name="name"
              type="text"
              required
              className="w-full glass-input px-4 py-3 rounded-lg text-sm"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Account Type</label>
            <select
              name="accountType"
              required
              className="w-full glass-input px-4 py-3 rounded-lg text-sm appearance-none"
            >
              <option value="INDIVIDUAL">Individual / Freelancer</option>
              <option value="COMPANY">Company / Partnership</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Business Type</label>
            <select
              name="businessType"
              required
              className="w-full glass-input px-4 py-3 rounded-lg text-sm appearance-none"
            >
              <option value="RETAIL">Retail</option>
              <option value="SERVICES">Services</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
            <input
              name="country"
              type="text"
              required
              defaultValue="India"
              className="w-full glass-input px-4 py-3 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">State / Province</label>
            <input
              name="state"
              type="text"
              required
              className="w-full glass-input px-4 py-3 rounded-lg text-sm"
              placeholder="e.g. Maharashtra"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
            <input
              name="city"
              type="text"
              required
              className="w-full glass-input px-4 py-3 rounded-lg text-sm"
              placeholder="e.g. Mumbai"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Base Currency</label>
            <select
              name="baseCurrency"
              required
              className="w-full glass-input px-4 py-3 rounded-lg text-sm appearance-none"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Fiscal Year Start</label>
            <select
              name="fiscalYearStart"
              required
              className="w-full glass-input px-4 py-3 rounded-lg text-sm appearance-none"
            >
              <option value="APRIL">April</option>
              <option value="JANUARY">January</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tax Registered?</label>
            <select
              name="taxRegistrationStatus"
              required
              onChange={(e) => setHasTaxId(e.target.value === 'true')}
              className="w-full glass-input px-4 py-3 rounded-lg text-sm appearance-none"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          {hasTaxId && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">GSTIN / Tax ID Number</label>
              <input
                name="taxId"
                type="text"
                required={hasTaxId}
                className="w-full glass-input px-4 py-3 rounded-lg text-sm"
                placeholder="e.g. 27AAAAA1111A1Z1"
              />
            </div>
          )}

          <div className="md:col-span-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Initializing business...' : 'Complete Onboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
