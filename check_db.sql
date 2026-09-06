SELECT typname FROM pg_type WHERE typname = 'PurchaseBillStatus';
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Supplier', 'PurchaseBill', 'PurchaseBillItem', 'PurchasePayment', 'ExpenseCategory', 'Expense', 'PurchaseSequence', 'ExpenseSequence');
SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Payment' AND column_name IN ('reversedAt', 'reversedById', 'reversalReason');
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;