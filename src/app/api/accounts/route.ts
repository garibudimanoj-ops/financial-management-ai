import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { prisma } from '@/lib/prisma';
import { requirePermission, requireRole } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { AccountType } from '@prisma/client';

/**
 * GET /api/accounts
 * Lists chart of accounts for a business.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const requestedBusinessId = searchParams.get('businessId') || searchParams.get('companyId') || undefined;
  const context = await requirePermission(requestedBusinessId, 'REPORT_READ');
  const businessId = context.businessId;

  const accounts = await prisma.account.findMany({
    where: { businessId },
    orderBy: { code: 'asc' },
  });

  return jsonResponse({
    accounts: accounts.map((a) => ({
      id: a.id,
      businessId: a.businessId,
      code: a.code,
      name: a.name,
      type: a.type,
      category: a.category,
      currency: a.currency,
      balance: a.balance.toString(),
      isActive: a.isActive,
      description: a.description,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  });
});

/**
 * POST /api/accounts
 * Creates a new account in the chart of accounts.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const requestedBusinessId = body.businessId || body.companyId;
  const context = await requireRole(requestedBusinessId, ['OWNER', 'ADMIN']);
  const businessId = context.businessId;

  if (!body.code || !body.name || !body.type) {
    throw new AppError('code, name, and type are required', 'VALIDATION_ERROR', 400);
  }

  const validTypes: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
  if (!validTypes.includes(body.type)) {
    throw new AppError(`Invalid account type: ${body.type}`, 'VALIDATION_ERROR', 400);
  }

  const existing = await prisma.account.findUnique({
    where: {
      businessId_code: {
        businessId,
        code: body.code,
      },
    },
  });

  if (existing) {
    throw new AppError(`Account code '${body.code}' already exists for this business`, 'VALIDATION_ERROR', 400);
  }

  const account = await prisma.account.create({
    data: {
      businessId,
      code: body.code,
      name: body.name,
      type: body.type as AccountType,
      category: body.category || null,
      currency: body.currency || 'INR',
      description: body.description || null,
    },
  });

  return jsonResponse(
    {
      ...account,
      balance: account.balance.toString(),
    },
    201
  );
});
