/* eslint-disable react-hooks/error-boundaries */
import { requireBusinessContext, hasPermission } from '@/lib/auth';
import CAAssistantClient from '@/components/ca-assistant/CAAssistantClient';
import PageHeader from '@/components/ui/PageHeader';
import { BotMessageSquare, AlertCircle } from 'lucide-react';

export default async function CAAssistantPage() {
  try {
    const context = await requireBusinessContext();
    const canAccess = hasPermission(context.role, 'CA_ASSISTANT');

  if (!canAccess) {
    return (
      <div className="max-w-4xl mx-auto py-16 flex items-center justify-center">
        <div className="glass-card p-8 text-center space-y-4 max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Access Restricted</h1>
          <p className="text-sm text-slate-400">
            CA Assistant is not enabled for your assigned role or workspace permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="CA Assistant & Financial Copilot"
        subtitle="Conversational financial intelligence engine for ledger inquiries, GST calculations, and draft transactions."
        icon={<BotMessageSquare className="w-6 h-6 text-indigo-400" />}
      />

      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
        <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200">Advisory Disclaimer</span>
        <span>General guidance only. Not a replacement for a certified Chartered Accountant. Action drafts require explicit confirmation before posting to the ledger.</span>
      </div>

      <CAAssistantClient businessId={context.businessId} role={context.role} />
    </div>
  );
  } catch (err: unknown) {
    console.error('[CA Assistant Page] Error:', err);
    return (
      <div className="max-w-4xl mx-auto py-16 flex items-center justify-center">
        <div className="glass-card p-8 text-center space-y-4 max-w-md">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Unable to Load Copilot</h1>
          <p className="text-sm text-slate-400">
            A temporary issue prevented loading the CA Assistant. Please retry or contact support if this continues.
          </p>
        </div>
      </div>
    );
  }
}
