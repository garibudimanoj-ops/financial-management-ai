import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { getBalanceSheet } from '@/services/accounting/reportService';
import { requirePermission } from '@/lib/auth';

/**
 * GET /api/reports/balance-sheet
 * Returns the Balance Sheet statement as of a given date.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;
  const asOfDate = searchParams.get('asOfDate') || undefined;

  const context = await requirePermission(requestedBusinessId, 'REPORT_READ');

  const report = await getBalanceSheet(context.businessId, asOfDate);
  return jsonResponse(report);
});
