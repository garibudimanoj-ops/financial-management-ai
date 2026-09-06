import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { getProfitAndLoss } from '@/services/accounting/reportService';
import { requirePermission } from '@/lib/auth';

/**
 * GET /api/reports/profit-loss
 * Returns the P&L statement for a business and date range.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const context = await requirePermission(requestedBusinessId, 'REPORT_READ');

  const report = await getProfitAndLoss(context.businessId, startDate, endDate);
  return jsonResponse(report);
});
