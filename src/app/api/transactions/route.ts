import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { createTransaction, listTransactions } from '@/services/accounting/transactionService';
import { requireBusinessContext } from '@/lib/auth';

/**
 * POST /api/transactions
 * Creates a double-entry transaction.
 * Strictly validates that debits and credits balance.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  
  // Optional auth context resolution if businessId is not explicitly provided
  let businessId = body.businessId || body.companyId;
  let userId: string | undefined = undefined;

  try {
    const context = await requireBusinessContext(businessId);
    businessId = context.businessId;
    userId = context.userId;
  } catch {
    // If running in public/test mode or external API token
  }

  const transaction = await createTransaction({
    ...body,
    businessId,
    userId: body.userId || userId,
  });

  return jsonResponse(transaction, 201);
});

/**
 * GET /api/transactions
 * Retrieves transactions for a business.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  let businessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  if (!businessId) {
    const context = await requireBusinessContext();
    businessId = context.businessId;
  }

  const result = await listTransactions(businessId, { limit, offset, status });
  return jsonResponse(result);
});
