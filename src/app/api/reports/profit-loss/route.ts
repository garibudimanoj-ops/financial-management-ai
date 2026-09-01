import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { getProfitAndLoss } from '@/services/accounting/reportService';
import { requireBusinessContext } from '@/lib/auth';
import { AppError } from '@/lib/errors';

/**
 * GET /api/reports/profit-loss
 * Returns the P&L statement for a business and date range.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  let businessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  if (!businessId) {
    try {
      const context = await requireBusinessContext();
      businessId = context.businessId;
    } catch {
      throw new AppError('Business ID is required as a query parameter', 'VALIDATION_ERROR', 400);
    }
  }

  const report = await getProfitAndLoss(businessId, startDate, endDate);
  return jsonResponse(report);
});
