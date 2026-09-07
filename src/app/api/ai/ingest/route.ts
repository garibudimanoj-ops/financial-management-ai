import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '@/lib/apiResponse';
import { parseFinancialDocument } from '@/services/ai/documentParser';
import { orchestrateDocumentToDraftTransaction } from '@/services/ai/llmOrchestrator';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rateLimit';
import { Prisma } from '@prisma/client';

type DraftTransactionResponse = Prisma.TransactionGetPayload<{
  include: {
    entries: {
      include: { account: true };
    };
  };
}>;

/**
 * POST /api/ai/ingest
 * Ingests financial documents (invoices/bills) via AI parsing and creates draft journal entries.
 * Sets status: "DRAFT" and requires_human_review: true.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  // 1. Rate limiting check
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const isAllowed = checkRateLimit(`ai-ingest:${ip}`, 30, 60000); // 30 requests per minute
  if (!isAllowed) {
    throw new AppError('Too many AI ingest requests. Please try again later.', 'RATE_LIMITED', 429);
  }

  const body = await req.json();
  const requestedBusinessId = body.businessId || body.companyId;
  const context = await requirePermission(requestedBusinessId, 'AI_FINANCIAL_READ');
  const { businessId, userId } = context;

  const fileName = body.fileName || 'uploaded-invoice.pdf';
  const fileContent = body.fileContent || '';
  const isInterState = Boolean(body.isInterState);

  // 2. Parse Document
  const parsedDoc = await parseFinancialDocument(fileContent, fileName);

  // 3. AI Orchestration with Deterministic Calculations
  const draftProposal = await orchestrateDocumentToDraftTransaction(parsedDoc, isInterState);

  // 4. Save as Draft Transaction in General Ledger if saveDraft is requested (default true)
  let savedDraft: DraftTransactionResponse | null = null;
  if (body.saveDraft !== false) {
    // Map account codes to actual accounts for this business
    const accounts = await prisma.account.findMany({
      where: { businessId },
    });

    const accountMap = new Map<string, string>(accounts.map((a: { code: string; id: string }) => [a.code, a.id]));

    // Find or fallback to primary accounts
    const entriesData: Array<{ accountId: string; debit: string; credit: string; description?: string }> = [];

    for (const entry of draftProposal.data.entries) {
      let accountId: string | undefined = accountMap.get(entry.accountCode);
      if (!accountId) {
        // Fallback to first asset or liability account if specific code not present
        const fallback = accounts[0];
        if (fallback) accountId = fallback.id;
      }

      if (accountId) {
        entriesData.push({
          accountId,
          debit: entry.debit,
          credit: entry.credit,
          description: entry.accountName,
        });
      }
    }

    if (entriesData.length >= 2) {
      const count = await prisma.transaction.count({ where: { businessId } });
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const txnNumber = `TXN-DRAFT-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

      savedDraft = await prisma.transaction.create({
        data: {
          businessId,
          transactionNumber: txnNumber,
          date: new Date(draftProposal.data.date),
          description: draftProposal.data.description,
          reference: draftProposal.data.reference || null,
          status: 'DRAFT',
          requiresHumanReview: true,
          verifiedStatus: 'UNVERIFIED',
          createdById: userId || null,
          entries: {
            create: entriesData.map((e) => ({
              accountId: e.accountId,
              debit: e.debit,
              credit: e.credit,
              description: e.description || null,
            })),
          },
        },
        include: {
          entries: {
            include: { account: true },
          },
        },
      });
    }
  }

  return jsonResponse(
    {
      parsedDocument: parsedDoc,
      draftProposal: draftProposal.data,
      savedDraft: savedDraft
        ? {
            id: savedDraft.id,
            transactionNumber: savedDraft.transactionNumber,
            status: savedDraft.status,
            requiresHumanReview: savedDraft.requiresHumanReview,
            verifiedStatus: savedDraft.verifiedStatus,
          }
        : null,
      metadata: {
        verified_sources: draftProposal.verified_sources,
        verification_status: draftProposal.verification_status,
        requires_human_review: draftProposal.requires_human_review,
        warnings: draftProposal.warnings,
      },
    },
    201
  );
});
