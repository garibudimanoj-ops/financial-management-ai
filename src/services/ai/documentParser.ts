import { ParsedDocumentResult } from '@/types/ai';

export interface DocumentParserOptions {
  ocrLanguage?: string;
  extractLineItems?: boolean;
}

/**
 * Document Parser Interface & Mock Implementation
 * In production, connects to AWS Textract, Google Cloud Document AI, or Azure Form Recognizer.
 */
export async function parseFinancialDocument(
  fileBuffer: Buffer | string,
  fileName: string,
  options: DocumentParserOptions = {}
): Promise<ParsedDocumentResult> {
  // Mock parser for demo and local execution
  const isInvoice = fileName.toLowerCase().includes('invoice') || fileName.toLowerCase().includes('bill');

  return {
    vendorName: isInvoice ? 'TechSupply Solutions Pvt Ltd' : 'Standard Office Depot',
    invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    currency: 'INR',
    subtotal: 10000.0,
    taxAmount: 1800.0,
    totalAmount: 11800.0,
    confidenceScore: 0.94,
    items: [
      {
        description: 'Dell 27-inch 4K Monitor',
        quantity: 2,
        unitPrice: 5000.0,
        taxRate: 18.0,
        total: 11800.0,
        suggestedAccountCode: '1200', // Inventory Asset or Fixed Asset
      },
    ],
    metadata: {
      verified_sources: ['OCR_TEXTRACT_V2', fileName],
      verification_status: 'UNVERIFIED',
      requires_human_review: true,
    },
  };
}
