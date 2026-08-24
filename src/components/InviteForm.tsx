'use client';

import { useState } from 'react';
import { inviteMember } from '@/actions/business';

interface InviteFormProps {
  businessId: string;
}

export default function InviteForm({ businessId }: InviteFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const role = formData.get('role') as 'OWNER' | 'ADMIN' | 'STAFF';

    try {
      await inviteMember(businessId, { email, role });
      setSuccess(true);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-bold text-gray-200">Invite New Member</h3>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-lg text-xs">
          Invitation sent successfully!
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          name="email"
          type="email"
          required
          className="flex-1 glass-input px-4 py-2 rounded-lg text-sm"
          placeholder="employee@example.com"
        />

        <select
          name="role"
          required
          className="glass-input px-4 py-2 rounded-lg text-sm appearance-none"
        >
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
          <option value="OWNER">Owner</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all shadow-md"
        >
          {loading ? 'Inviting...' : 'Invite'}
        </button>
      </div>
    </form>
  );
}
