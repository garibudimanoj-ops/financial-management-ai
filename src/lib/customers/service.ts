import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { toDecimal, DecimalLike } from '@/lib/inventory/valuation';
import { LedgerEntryType, Prisma } from '@prisma/client';

export interface CreateLedgerEntryInput {
  businessId: string;
  customerId: string;
  invoiceId?: string | null;
  paymentId?: string | null;
  entryType: LedgerEntryType;
  amount: DecimalLike;
  description?: string | null;
  reference?: string | null;
  userId?: string | null;
}

/**
 * Transactionally records an immutable ledger entry for a customer and updates their cached balance.
 */
export async function recordLedgerEntry(
  tx: Prisma.TransactionClient,
  input: CreateLedgerEntryInput
) {
  const customer = await tx.customer.findUnique({
    where: { id: input.customerId },
  });

  if (!customer || customer.businessId !== input.businessId) {
    throw new AppError('Customer not found in this business', 'NOT_FOUND');
  }

  const amt = toDecimal(input.amount);
  const currentBalance = customer.currentBalance;
  let newBalance: Prisma.Decimal;

  switch (input.entryType) {
    case 'INVOICE':
    case 'DEBIT':
      // Invoice or Debit increases customer's outstanding receivable
      newBalance = currentBalance.plus(amt);
      break;

    case 'PAYMENT':
    case 'CREDIT':
    case 'REFUND':
      // Payment, Credit, or Refund decreases customer's outstanding balance
      newBalance = currentBalance.minus(amt);
      break;

    case 'OPENING_BALANCE':
    case 'ADJUSTMENT':
      newBalance = currentBalance.plus(amt);
      break;

    default:
      newBalance = currentBalance.plus(amt);
  }

  const entry = await tx.customerLedgerEntry.create({
    data: {
      businessId: input.businessId,
      customerId: input.customerId,
      invoiceId: input.invoiceId || null,
      paymentId: input.paymentId || null,
      entryType: input.entryType,
      amount: amt,
      balanceAfter: newBalance,
      description: input.description || null,
      reference: input.reference || null,
      createdById: input.userId || null,
    },
  });

  await tx.customer.update({
    where: { id: input.customerId },
    data: { currentBalance: newBalance },
  });

  return { entry, balanceAfter: newBalance };
}

/**
 * Reconciles customer's cached balance against full ledger history.
 */
export async function reconcileCustomerBalance(businessId: string, customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      ledgerEntries: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!customer || customer.businessId !== businessId) {
    throw new AppError('Customer not found in this business', 'NOT_FOUND');
  }

  let computedBalance = customer.openingBalance;

  for (const entry of customer.ledgerEntries) {
    switch (entry.entryType) {
      case 'INVOICE':
      case 'DEBIT':
        computedBalance = computedBalance.plus(entry.amount);
        break;
      case 'PAYMENT':
      case 'CREDIT':
      case 'REFUND':
        computedBalance = computedBalance.minus(entry.amount);
        break;
      case 'ADJUSTMENT':
        computedBalance = computedBalance.plus(entry.amount);
        break;
      default:
        break;
    }
  }

  return {
    cachedBalance: customer.currentBalance,
    computedBalance,
    isReconciled: customer.currentBalance.equals(computedBalance),
  };
}
