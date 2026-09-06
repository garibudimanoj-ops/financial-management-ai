import { computeTaxBreakdown } from './computationEngine';
import { AIOrchestrationResult, CalculationResult, ParsedDocumentResult } from '@/types/ai';

export interface DraftTransactionProposal {
  description: string;
  date: string;
  reference?: string;
  entries: Array<{
    accountCode: string;
    accountName: string;
    debit: string;
    credit: string;
  }>;
  totalAmount: string;
  taxBreakdown?: CalculationResult;
}

/**
 * AI LLM Orchestrator
 * Interprets financial documents, suggests journal entries and classification,
 * but DELEGATES all numeric calculations to the deterministic computationEngine.
 * 
 * SAFETY GUARDRAIL:
 * All AI outputs MUST carry verification metadata and be reviewed by a qualified CA.
 */
export async function orchestrateDocumentToDraftTransaction(
  parsedDoc: ParsedDocumentResult,
  isInterState = false
): Promise<AIOrchestrationResult<DraftTransactionProposal>> {
  // TODO: CA review required - Account code mapping and GST rate classification must be verified by a Chartered Accountant
  const taxCalculations = computeTaxBreakdown(
    parsedDoc.subtotal,
    parsedDoc.subtotal > 0 ? (parsedDoc.taxAmount / parsedDoc.subtotal) * 100 : 18,
    isInterState
  );

  const subtotalStr = parsedDoc.subtotal.toFixed(2);
  const totalAmountStr = parsedDoc.totalAmount.toFixed(2);
  const taxStr = parsedDoc.taxAmount.toFixed(2);

  // TODO: CA review required - Input Tax Credit (ITC) eligibility under Section 16 CGST Act requires verification of supplier GSTR-2B filing
  const proposedEntries = [
    {
      accountCode: '1200', // Inventory Asset or Expense
      accountName: 'Purchases / Inventory Asset',
      debit: subtotalStr,
      credit: '0.00',
    },
    {
      accountCode: '2020', // Input Tax Credit / GST Input
      accountName: isInterState ? 'IGST Input Credit' : 'CGST/SGST Input Credit',
      debit: taxStr,
      credit: '0.00',
    },
    {
      accountCode: '2010', // Accounts Payable (Creditor)
      accountName: parsedDoc.vendorName ? `AP - ${parsedDoc.vendorName}` : 'Accounts Payable',
      debit: '0.00',
      credit: totalAmountStr,
    },
  ];

  return {
    data: {
      description: `Purchase from ${parsedDoc.vendorName || 'Vendor'} (Invoice: ${parsedDoc.invoiceNumber || 'N/A'})`,
      date: parsedDoc.date || new Date().toISOString().slice(0, 10),
      reference: parsedDoc.invoiceNumber,
      entries: proposedEntries,
      totalAmount: totalAmountStr,
      taxBreakdown: taxCalculations,
    },
    verified_sources: parsedDoc.metadata.verified_sources,
    verification_status: 'UNVERIFIED',
    requires_human_review: true,
    warnings: [
      'Statutory classifications and GST input tax credit eligibility must be confirmed by an authorized CA.',
      'This is an AI-generated draft journal entry and has not been committed to the general ledger.',
    ],
  };
}
