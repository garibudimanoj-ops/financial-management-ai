-- Additive payment-reversal metadata to the Payment model.
-- A payment is reversible only while reversedAt is NULL; once reversed it is final.

ALTER TABLE "Payment" ADD COLUMN "reversedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "reversedById" TEXT;
ALTER TABLE "Payment" ADD COLUMN "reversalReason" TEXT;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reversedById_fkey"
  FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL;

CREATE INDEX "Payment_businessId_reversedAt_idx" ON "Payment"("businessId", "reversedAt");