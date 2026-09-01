import { describe, it, expect } from 'vitest';
import { computeTaxBreakdown, computeLineItem } from './computationEngine';
import { parseFinancialDocument } from './documentParser';
import { orchestrateDocumentToDraftTransaction } from './llmOrchestrator';

describe('AI Financial Scaffolding & Computation Engine', () => {
  describe('computationEngine (Deterministic Arithmetic)', () => {
    it('1. should calculate intra-state GST (CGST + SGST) accurately', () => {
      // Subtotal ₹10,000 @ 18% GST intra-state (9% CGST, 9% SGST)
      const res = computeTaxBreakdown(10000, 18, false);

      expect(res.taxableAmount).toBe('10000.00');
      expect(res.cgstAmount).toBe('900.00');
      expect(res.sgstAmount).toBe('900.00');
      expect(res.igstAmount).toBe('0.00');
      expect(res.totalTaxAmount).toBe('1800.00');
      expect(res.finalPayableAmount).toBe('11800.00');
      expect(res.verification_status).toBe('VERIFIED');
    });

    it('2. should calculate inter-state GST (IGST) accurately', () => {
      // Subtotal ₹20,000 @ 18% GST inter-state (18% IGST)
      const res = computeTaxBreakdown(20000, 18, true);

      expect(res.cgstAmount).toBe('0.00');
      expect(res.sgstAmount).toBe('0.00');
      expect(res.igstAmount).toBe('3600.00');
      expect(res.totalTaxAmount).toBe('3600.00');
      expect(res.finalPayableAmount).toBe('23600.00');
    });

    it('3. should handle discount and TDS deductions deterministically', () => {
      // Gross: ₹50,000, Discount: ₹5,000 -> Taxable: ₹45,000
      // Tax: 18% of 45,000 = ₹8,100
      // TDS: 10% on Taxable (45,000) = ₹4,500
      // Final Payable: 45,000 + 8,100 - 4,500 = ₹48,600
      const res = computeTaxBreakdown(50000, 18, false, 5000, 10);

      expect(res.taxableAmount).toBe('45000.00');
      expect(res.totalTaxAmount).toBe('8100.00');
      expect(res.tdsAmount).toBe('4500.00');
      expect(res.finalPayableAmount).toBe('48600.00');
    });

    it('4. should compute line item totals with discounts and fractional rates', () => {
      const line = computeLineItem(3, 1500, 10, 18);
      // Gross = 3 * 1500 = 4500
      // Discount = 10% of 4500 = 450
      // Net = 4050
      // Tax = 18% of 4050 = 729
      // Line Total = 4050 + 729 = 4779
      expect(line.gross).toBe('4500.00');
      expect(line.discountAmount).toBe('450.00');
      expect(line.netAmount).toBe('4050.00');
      expect(line.taxAmount).toBe('729.00');
      expect(line.lineTotal).toBe('4779.00');
    });
  });

  describe('documentParser & llmOrchestrator Guardrails', () => {
    it('5. should parse document and return structured result with verification metadata', async () => {
      const parsed = await parseFinancialDocument('mock-buffer', 'vendor-tax-invoice.pdf');

      expect(parsed.vendorName).toBeDefined();
      expect(parsed.totalAmount).toBeGreaterThan(0);
      expect(parsed.metadata.verification_status).toBe('UNVERIFIED');
      expect(parsed.metadata.requires_human_review).toBe(true);
    });

    it('6. should orchestrate draft transaction proposals with mandatory CA review warnings', async () => {
      const parsed = await parseFinancialDocument('mock-buffer', 'invoice.pdf');
      const orchestrated = await orchestrateDocumentToDraftTransaction(parsed);

      expect(orchestrated.data.entries.length).toBeGreaterThanOrEqual(2);
      expect(orchestrated.verification_status).toBe('UNVERIFIED');
      expect(orchestrated.requires_human_review).toBe(true);
      expect(orchestrated.warnings).toBeDefined();
      expect(orchestrated.warnings?.length).toBeGreaterThan(0);
    });
  });
});
