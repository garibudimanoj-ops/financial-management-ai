import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { getTrialBalance } from '@/services/accounting/reportService';
import { requirePermission } from '@/lib/auth';

/**
 * GET /api/reports/trial-balance
 * Returns the trial balance for a business with debit/credit aggregates.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;
  const context = await requirePermission(requestedBusinessId, 'REPORT_READ');

  const report = await getTrialBalance(context.businessId);
  return jsonResponse(report);
});
