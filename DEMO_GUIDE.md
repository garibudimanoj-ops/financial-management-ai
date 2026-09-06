# Demo Guide — Financial Management AI (SaaS)

Purpose: One-click demonstration for portfolio/recruitment. Safe to run; does not overwrite production data.

## 1. Seed Demo Data (Manual — BLOCKED by ts-node in current environment)
Run (requires `DATABASE_URL` from `.env.local` and `ts-node` installed):
```bash
# Compile TS first (if no ts-node):
npx tsc scripts/seed-demo.ts --outDir scripts/dist --moduleResolution node --esModuleInterop --declaration false --outDir temp
node temp/seed-demo.js
```

If seed runs successfully, it creates:
- Demo business (`biz-demo-001`): "Demo Financial Co"
- 10 products, 5 customers, 3 suppliers, 2 invoices (1 PAID, 1 PARTIALLY_PAID), 2 purchase bills, 2 expenses.

If seed is not executed (current state: BLOCKED), the dashboard will show minimal data (only base business). All features still work.

## 2. Manual Demo Flow
1. `npm run dev`
2. Open `http://localhost:3000/login`
3. Login with demo credentials (documented separately; do not commit to repo).
4. Navigate: Dashboard → POS → add item → checkout → invoice created.
5. Navigate: Invoices → view created invoice → record payment.
6. Navigate: Purchases → create bill → receive/post.
7. Navigate: Expenses → create expense.
8. Navigate: Reports → Trial Balance / Profit & Loss / Balance Sheet.

## 3. Security Notice
- `.env` and `.env.local` contain real database credentials and must never be committed (`.gitignore` excludes `.env*`).
- Demo seed uses a separate business ID (`biz-demo-001`) to avoid mixing with production data.
- If demo data is accidentally created in production business, delete it manually via admin actions; the seed script is designed to be idempotent.

## 4. Known Blockers
- Audit log viewer: `BLOCKED` (not implemented).
- Health endpoint (`/api/health`): `BLOCKED` (not implemented).
- Dedicated tax report page: `BLOCKED`.
- CSV export buttons: `BLOCKED`.
- Printable/PDF invoice: `BLOCKED`.
- Subscription/billing page: `BLOCKED`.
