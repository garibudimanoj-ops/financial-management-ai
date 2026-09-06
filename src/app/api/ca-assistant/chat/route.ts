import { NextRequest, NextResponse } from 'next/server';
import { requireBusinessContext, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const context = await requireBusinessContext();
    const canAccess = hasPermission(context.role, 'CA_ASSISTANT');

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { message, businessId } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required.' }, { status: 400 });
    }
    if (businessId !== context.businessId) {
      return NextResponse.json({ error: 'Invalid business scope.' }, { status: 403 });
    }

    // Action suggestions require user confirmation; drafts only, no posting
    const isSuggestion = message.toLowerCase().includes('suggest') || message.toLowerCase().includes('draft');

    const auditDetails = {
      suggested_by: 'ca_assistant',
      action_type: isSuggestion ? 'action_suggestion' : 'read_query',
      message_preview: message.slice(0, 200),
      businessId: context.businessId,
    };

    await logAuditEvent({
      action: 'CA_ASSISTANT_INTERACTION',
      businessId: context.businessId,
      userId: context.userId,
      details: auditDetails,
    });

    const responseText = isSuggestion
      ? `CA Assistant (draft only — requires your confirmation): Suggestion prepared for business "${context.businessId}". ` +
        `No records have been posted. Please confirm before any action is finalized.`
      : `CA Assistant: You asked about the business "${context.businessId}". ` +
        `This is read-only mode. For action suggestions, please confirm before any draft is created.`;

    return NextResponse.json({
      message: responseText,
      businessId: context.businessId,
      requires_confirmation: isSuggestion,
      audit_metadata: auditDetails,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 400 });
    }
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
