export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED';

export interface ParsedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total: number;
  suggestedAccountCode?: string;
}

export interface ParsedDocumentResult {
  vendorName?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  items: ParsedLineItem[];
  rawText?: string;
  confidenceScore: number;
  metadata: {
    verified_sources: string[];
    verification_status: VerificationStatus;
    requires_human_review: boolean;
  };
}

export interface CalculationInput {
  subtotal: number | string;
  taxRate: number | string;
  discountAmount?: number | string;
  tdsRate?: number | string;
  isInterState?: boolean;
}

export interface CalculationResult {
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTaxAmount: string;
  tdsAmount: string;
  finalPayableAmount: string;
  verification_status: 'VERIFIED';
}

export interface AIOrchestrationResult<T = unknown> {
  data: T;
  verified_sources: string[];
  verification_status: VerificationStatus;
  requires_human_review: boolean;
  warnings?: string[];
}
