# Financial Management AI — CA Co-Pilot Upgrade

Industry-ready Chartered Accountant (CA) Co-Pilot with double-entry accounting primitives, deterministic financial computation engine, safe AI document ingestion, and tenant RBAC security built on Next.js 16 (App Router), TypeScript, and Prisma ORM.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js >= 20.x
- PostgreSQL database instance
- npm >= 9.x

### 2. Setup Steps

```bash
# 1. Clone repository
git clone <repo-url>
cd financial-management-ai

# 2. Install dependencies
npm ci

# 3. Configure environment variables
cp .env.example .env
# Edit .env and supply your DATABASE_URL, NEXTAUTH_SECRET, etc.

# 4. Generate Prisma Client
npm run prisma:generate

# 5. Run Database Migrations (Additive)
npm run prisma:migrate

# 6. Seed Demo Company, Accounts, and Balanced Ledger
npm run seed

# 7. Start Development Server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏛️ Architecture & Accounting Primitives

### Double-Entry General Ledger
All financial transactions strictly enforce the fundamental accounting equation:
$$\sum \text{Debits} = \sum \text{Credits}$$

- **`Account`**: Chart of Accounts categorized as `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, or `EXPENSE`.
- **`Transaction`**: Journal entry header containing metadata, status (`DRAFT`, `POSTED`, `VOID`), and CA verification tags.
- **`Entry`**: Immutable line items tracking exact `debit` and `credit` amounts using `Prisma.Decimal` (15, 2 precision).

### AI Scaffolding & Legal Guardrails
1. **Deterministic Computation**: Large Language Models are strictly prohibited from performing raw arithmetic. All calculations (tax breakdowns, GST splits, TDS deductions, line totals) are delegated to `src/services/ai/computationEngine.ts`.
2. **Human-in-the-Loop Review**: All AI-ingested invoices are flagged with `requires_human_review: true` and `verification_status: "UNVERIFIED"`.
3. **Statutory Logic Annotation**: Any statutory interpretation in code is marked with `// TODO: CA review required`.
4. **No Auto-Filing**: The system never submits statutory returns or executes irreversible filings without explicit human approval.

---

## 📡 API Reference

### 1. Double-Entry Transactions
- **`POST /api/transactions`**
  - Accepts a balanced double-entry transaction payload.
  - Rejects unbalanced payloads with `HTTP 400` and error message `"Debits and credits must balance"`.

**Sample Balanced Payload:**
```json
{
  "companyId": "biz-apex-demo",
  "description": "Sale received in cash",
  "entries": [
    { "accountId": "acc_cash_cuid", "debit": "2000.00", "credit": "0.00" },
    { "accountId": "acc_sales_cuid", "debit": "0.00", "credit": "2000.00" }
  ]
}
```

- **`GET /api/transactions?businessId=<id>`**
  - Lists posted and draft transactions.

### 2. Financial Reports
- **`GET /api/reports/trial-balance?businessId=<id>`**
  - Returns debit/credit aggregates per account and verifies zero net imbalance.
- **`GET /api/reports/profit-loss?businessId=<id>&startDate=2026-01-01&endDate=2026-12-31`**
  - Computes net profit or loss (Revenue vs. Expenses).
- **`GET /api/reports/balance-sheet?businessId=<id>`**
  - Returns statement of financial position (Assets = Liabilities + Equity).

### 3. Safe AI Ingestion
- **`POST /api/ai/ingest`**
  - Parses uploaded invoice documents, computes GST/TDS breakdowns, and creates a draft journal entry (`status: "DRAFT"`).

---

## 🧪 Testing

Run the full Vitest unit and integration test suite:

```bash
npm test
```

Includes test suites for:
- Double-entry balance validation (balanced vs unbalanced payloads)
- Trial balance, P&L, and Balance Sheet report aggregation
- Deterministic tax and TDS calculation engine
- AI document parser and orchestrator verification metadata
- Multi-tenant RBAC and in-memory rate limiting

---

## 🔄 Rollback Plan

All database schema modifications are purely **additive** (`Account`, `Transaction`, `Entry` models added without dropping or modifying legacy columns).

To safely roll back changes:
1. Revert to `main` branch:
   ```bash
   git checkout main
   ```
2. Re-generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```
3. Existing legacy tables and operations remain 100% intact and unaffected.
