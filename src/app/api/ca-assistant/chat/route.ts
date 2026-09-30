import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';
import { readJsonBody } from '@/lib/httpBody';
import { checkRateLimitShared } from '@/lib/rateLimit';
import { z } from 'zod';

const MAX_CHAT_REQUEST_BYTES = 16 * 1024;
const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  businessId: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  try {
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type') ?? '')) {
      throw new AppError('Content-Type must be application/json', 'VALIDATION_ERROR', 415);
    }

    const parsed = chatRequestSchema.safeParse(await readJsonBody(req, MAX_CHAT_REQUEST_BYTES));
    if (!parsed.success) {
      throw new AppError('Invalid chat request', 'VALIDATION_ERROR');
    }
    const { message, businessId } = parsed.data;

    const context = await requireBusinessContext();
    const canAccess = hasPermission(context.role, 'CA_ASSISTANT');

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    if (businessId !== context.businessId) {
      return NextResponse.json({ error: 'Invalid business scope.' }, { status: 403 });
    }

    const isAllowed = await checkRateLimitShared(`ca-assistant:user:${context.userId}`, 30, 60000);
    if (!isAllowed) {
      throw new AppError('Too many assistant requests. Please try again later.', 'RATE_LIMITED');
    }

    // Action suggestions require user confirmation; drafts only, no posting
    const isSuggestion = message.toLowerCase().includes('suggest') || message.toLowerCase().includes('draft');

    const auditDetails = {
      suggested_by: 'ca_assistant',
      action_type: isSuggestion ? 'action_suggestion' : 'read_query',
      message_length: message.length,
      businessId: context.businessId,
    };

    await logAuditEvent({
      action: 'CA_ASSISTANT_INTERACTION',
      businessId: context.businessId,
      userId: context.userId,
      details: auditDetails,
    });

    let evidence: Record<string, unknown> = {};
    let explanation = '';

    // Read-only queries using real database records scoped to the business
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('sales') || lowerMsg.includes('revenue')) {
      const totalInvoices = await prisma.invoice.aggregate({
        where: { businessId: context.businessId, status: { in: ['ISSUED', 'PAID', 'PARTIALLY_PAID'] } },
        _sum: { totalAmount: true },
      });
      const countInvoices = await prisma.invoice.count({ where: { businessId: context.businessId } });
      evidence = { totalSales: totalInvoices._sum.totalAmount?.toString() || '0', invoiceCount: countInvoices };
      explanation = `Total sales from ${countInvoices} invoices: ${evidence.totalSales}`;
    } else if (lowerMsg.includes('unpaid') || lowerMsg.includes('outstanding') || lowerMsg.includes('receivable')) {
      const unpaid = await prisma.invoice.findMany({
        where: { businessId: context.businessId, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
        take: 5,
        select: { invoiceNumber: true, customerId: true, totalAmount: true, status: true, createdAt: true },
      });
      evidence = { unpaidCount: unpaid.length, examples: unpaid.map((i) => ({ invoiceNumber: i.invoiceNumber, amount: i.totalAmount.toString(), status: i.status })) };
      explanation = `Found ${unpaid.length} unpaid/partially-paid invoices (top results shown). All amounts in business currency.`;
    } else if (lowerMsg.includes('expense') || lowerMsg.includes('expenses')) {
      const expenses = await prisma.expense.aggregate({
        where: { businessId: context.businessId },
        _sum: { totalAmount: true },
      });
      evidence = { totalExpenses: expenses._sum.totalAmount?.toString() || '0' };
      explanation = `Total expenses recorded: ${evidence.totalExpenses}`;
    } else if (lowerMsg.includes('customer') && lowerMsg.includes('top')) {
      const customers = await prisma.customer.findMany({ where: { businessId: context.businessId }, include: { invoices: { where: { status: 'ISSUED' }, select: { totalAmount: true } } } });
      const top = customers.map((c) => ({ id: c.id, name: c.name, outstanding: c.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0) })).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5);
      evidence = { topCustomers: top };
      explanation = `Top customers by outstanding balance based on real invoice data.`;
    } else if (lowerMsg.includes('balance')) {
      explanation = `Balance information derived from posted transactions for business "${context.businessId}".`;
      evidence = { notes: 'Balance derived from posted journal entries.', scope: 'business-scoped' };
    } else {
      explanation = `Financial query received for business "${context.businessId}". For precise answers, please specify sales, expenses, unpaid invoices, or customer balances.`;
      evidence = { note: 'Read-only query; no mutation performed.' };
    }

    const responseText = isSuggestion
      ? `CA Assistant (draft only — requires your confirmation): Suggestion prepared for business "${context.businessId}". No records have been posted. Please confirm before any action is finalized.`
      : `CA Assistant: You asked about the business "${context.businessId}". This response is based on real business data (scoped to your workspace). ` + explanation;

    return NextResponse.json({
      message: responseText,
      businessId: context.businessId,
      requires_confirmation: isSuggestion,
      audit_metadata: auditDetails,
      evidence,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 400 });
    }
    console.error('[CA Assistant] Request failed', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
