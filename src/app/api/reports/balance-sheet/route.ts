import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { getBalanceSheet } from '@/services/accounting/reportService';
import { requirePermission } from '@/lib/auth';
import { extractBusinessId } from '@/lib/utils';

/**
 * GET /api/reports/balance-sheet
 * Returns the Balance Sheet statement as of a given date.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { businessId: requestedBusinessId } = extractBusinessId(req);
  const asOfDate = new URL(req.url).searchParams.get('asOfDate') || undefined;

  const context = await requirePermission(requestedBusinessId, 'REPORT_READ');

  const report = await getBalanceSheet(context.businessId, asOfDate);
  return jsonResponse(report);
});
