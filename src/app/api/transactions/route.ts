import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { createTransaction, listTransactions } from '@/services/accounting/transactionService';
import { requirePermission, requireRole } from '@/lib/auth';

/**
 * POST /api/transactions
 * Creates a double-entry transaction.
 * Strictly validates that debits and credits balance.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();

  const requestedBusinessId = body.businessId || body.companyId;
  const context = await requireRole(requestedBusinessId, ['OWNER', 'ADMIN']);

  const transaction = await createTransaction({
    ...body,
    businessId: context.businessId,
    userId: context.userId,
  });

  return jsonResponse(transaction, 201);
});

/**
 * GET /api/transactions
 * Retrieves transactions for a business.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const context = await requirePermission(requestedBusinessId, 'REPORT_READ');

  const result = await listTransactions(context.businessId, { limit, offset, status });
  return jsonResponse(result);
});
