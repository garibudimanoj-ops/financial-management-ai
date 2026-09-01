import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { getTrialBalance } from '@/services/accounting/reportService';
import { requireBusinessContext } from '@/lib/auth';
import { AppError } from '@/lib/errors';

/**
 * GET /api/reports/trial-balance
 * Returns the trial balance for a business with debit/credit aggregates.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  let businessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;

  if (!businessId) {
    try {
      const context = await requireBusinessContext();
      businessId = context.businessId;
    } catch {
      throw new AppError('Business ID is required as a query parameter (e.g. ?businessId=...)', 'VALIDATION_ERROR', 400);
    }
  }

  const report = await getTrialBalance(businessId);
  return jsonResponse(report);
});
