import { NextRequest } from 'next/server';

export function extractBusinessId(request: NextRequest, body?: Record<string, unknown>): { businessId: string | undefined; useCompanyIdAlias: boolean } {
  const searchParams = new URL(request.url).searchParams;
  const businessId = searchParams.get('businessId') || (body?.businessId as string | undefined);
  const companyId = searchParams.get('companyId') || (body?.companyId as string | undefined);

  if (businessId) {
    return { businessId, useCompanyIdAlias: false };
  }
  if (companyId) {
    return { businessId: companyId, useCompanyIdAlias: true };
  }
  return { businessId: undefined, useCompanyIdAlias: false };
}