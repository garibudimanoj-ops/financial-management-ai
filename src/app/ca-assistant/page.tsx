import { requireBusinessContext, hasPermission } from '@/lib/auth';
import CAAssistantClient from '@/components/ca-assistant/CAAssistantClient';

export default async function CAAssistantPage() {
  const context = await requireBusinessContext();
  const canAccess = hasPermission(context.role, 'CA_ASSISTANT');

  if (!canAccess) {
    return (
      <div className="min-h-screen p-6 max-w-5xl mx-auto flex items-center justify-center">
        <div className="glass-card p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Access Restricted</h1>
          <p className="text-gray-400">CA Assistant is not available for this role or workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold text-white">CA Assistant</h1>
        <p className="text-gray-400 text-sm mt-2">
          AI assistant for financial questions. Not a replacement for a qualified Chartered Accountant.
        </p>
        <div className="mt-3 text-xs text-amber-400 bg-amber-900/20 border border-amber-500/30 rounded-lg px-3 py-2 inline-block">
          Disclaimer: General guidance only. Not legal or tax advice. Confirm all draft actions before posting.
        </div>
      </div>
      <CAAssistantClient businessId={context.businessId} role={context.role} />
    </div>
  );
}
