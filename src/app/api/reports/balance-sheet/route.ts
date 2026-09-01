import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { getBalanceSheet } from '@/services/accounting/reportService';
import { requireBusinessContext } from '@/lib/auth';
import { AppError } from '@/lib/errors';

/**
 * GET /api/reports/balance-sheet
 * Returns the Balance Sheet statement as of a given date.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  let businessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;
  const asOfDate = searchParams.get('asOfDate') || undefined;

  if (!businessId) {
    try {
      const context = await requireBusinessContext();
      businessId = context.businessId;
    } catch {
      throw new AppError('Business ID is required as a query parameter', 'VALIDATION_ERROR', 400);
    }
  }

  const report = await getBalanceSheet(businessId, asOfDate);
  return jsonResponse(report);
});
