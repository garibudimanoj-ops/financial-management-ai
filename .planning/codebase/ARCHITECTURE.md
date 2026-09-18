# Architecture

## High-Level Architecture

This is a **multi-tenant SaaS financial management application** built with Next.js 16 App Router, featuring:

- **Multi-tenancy**: Business-scoped data isolation via `BusinessMember` relationships
- **Server-first architecture**: Heavy use of Server Components, Server Actions, and Server Components
- **Supabase Auth + SSR**: Authentication via `@supabase/ssr` with cookie-based sessions
- **Prisma + PostgreSQL**: Type-safe database access with comprehensive schema
- **RBAC**: Role-based access control (OWNER, ADMIN, STAFF) with fine-grained permissions

---

## System Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Application                       │
├─────────────────────────────────────────────────────────────────┤
│  App Router (Server Components)                                 │
│  ├── (auth) routes: login, signup, forgot-password, reset-password│
│  ├── (dashboard) protected routes                               │
│  ├── api/                                                      │
│  │   ├── auth/callback          # PKCE callback handler         │
│   │   ├── ai/ingest             # AI document ingestion         │
│   │   └── health                # Health check endpoint         │
│  └── (modules) Feature modules (invoices, customers, etc.)      │
├─────────────────────────────────────────────────────────────────┤
│  Server Actions (src/actions/)                                 │
│  ├── auth.ts              # Authentication flows                │
│  ├── business.ts          # Business/onboarding/membership      │
│  ├── invoices.ts          # Invoice CRUD + workflows            │
│  ├── customers.ts         # Customer management                 │
│  ├── products.ts          # Product/inventory management        │
│  ├── payments.ts          # Payment processing                  │
│  ├── purchases.ts         # Purchase orders/bills               │
│  ├── expenses.ts          # Expense tracking                    │
│  ├── suppliers.ts         # Supplier management                 │
│  ├── reports.ts           # Financial reports                   │
│  ├── inventory.ts         # Inventory management                │
│  ├── accounting/          # Double-entry accounting engine      │
│  └── ai/                  # AI ingestion/processing             │
├─────────────────────────────────────────────────────────────────┤
│  Shared Libraries (src/lib/)                                   │
│  ├── auth.ts                # Auth context, RBAC, sync          │
│  ├── auth.test.ts           # Auth unit tests                   │
│  ├── permissions.ts         # RBAC permission matrix            │
│  ├── supabase/              # Supabase clients (server/client)  │
│  ├── auth.ts                # Core auth utilities               │
│  ├── audit.ts               # Audit logging                     │
│  ├── prisma.ts              # Prisma client singleton           │
│  ├── serialize.ts           # Serialization utilities           │
│  └── errors.ts              # Custom error classes              │
├─────────────────────────────────────────────────────────────────┤
│  Database (Prisma + PostgreSQL)                                │
│  ├── 705-line schema.prisma                                    │
│  ├── 40+ models with relationships                              │
│  ├── Multi-tenant isolation via BusinessMember                  │
│  └── Comprehensive indexes for query performance               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Patterns

### 1. Authentication Flow
```
User → Signup/Login → Supabase Auth → syncPrismaUser() → Prisma User
                              ↓
                        Sync BusinessMember
                              ↓
                        Set cookie (current_business_id)
                              ↓
                        Redirect: onboarding / dashboard
```

### 2. Request Flow (Protected Route)
```
Request → Middleware (updateSession)
    ↓
Server Component → requireAuth() → Supabase User
    ↓
requireBusinessContext() → Prisma BusinessMember
    ↓
BusinessContext → Server Action / Component
```

### 3. Server Action Pattern
```
Client Form → FormData → Server Action
    ↓
Zod Validation
    ↓
Prisma Transaction (atomic)
    ↓
Audit Log Entry
    ↓
redirect() / Return State
```

### 4. Double-Entry Accounting Flow
```
Financial Event (Sale/Payment/Expense)
    ↓
Service Function (e.g., recordSaleInvoiceJournal)
    ↓
Prisma Transaction:
  - Create Transaction
  - Create Entries (Debit/Credit pairs)
  - Update Account Balances
  - Create Audit Log
    ↓
  Immutable Transaction + Immutable Entries
```

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Server-first** | SEO, security, reduced client bundle, direct DB access |
| **Server Actions** | Type-safe mutations, no API route boilerplate, automatic revalidation |
| **Prisma + PostgreSQL** | Type-safe DB, migrations, relations, Decimal for money |
| **Supabase Auth + SSR** | Secure cookie handling, PKCE, session refresh, MFA ready |
| **Business-scoped isolation** | All queries filtered by `businessId` via `requireBusinessContext` |
| **Decimal for money** | Avoid floating-point errors (Prisma.Decimal @db.Decimal(15,2)) |
| **Immutable ledger** | Transactions + Entries are append-only; reversals via new entries |
| **Idempotency keys** | Prevent duplicate submissions on mutations |
| **Audit logging** | Every financial action logged with context |
| **Idempotency keys** | Prevent duplicate submissions on mutations |

---

## Security Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                     Security Layers                               │
├──────────────────────────────────────────────────────────────────┤
│  Network: Supabase SSL, HTTPS only                               │
├──────────────────────────────────────────────────────────────────┤
│  Transport: HTTPS only, Secure cookies, SameSite=Lax            │
├──────────────────────────────────────────────────────────────────┤
│  Application:                                                    │
│  • Supabase Auth (PKCE, secure cookies, MFA ready)              │
│  • Middleware: updateSession on every request                   │
│  • Server Actions: Server-side validation + Zod                 │
│  • RBAC: requirePermission() on every sensitive action          │
│  • Tenant Isolation: requireBusinessContext() on every query    │
│  • Idempotency keys: Prevent duplicate mutations                │
├──────────────────────────────────────────────────────────────────┤
│  Data:                                                          │
│  • Decimal for money (no float)                                 │
│  • Decimal(15,2) for amounts, (15,4) for quantities            │
│  • Immutable ledger (no UPDATE on posted transactions)          │
│  • Soft deletes (status=REMOVED) for audit trail                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production                                │
├─────────────────────────────────────────────────────────────────┤
│  Vercel / Vercel Edge Functions                                  │
│  ├── Next.js App (Edge + Node.js runtime)                       │
│  ├── Edge Middleware (updateSession)                            │
│  └── Server Actions (Node.js runtime)                           │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Cloud                                                  │
│  ├── PostgreSQL (with PgBouncer)                                │
│  ├── Auth (Email/Password, Magic Link, PKCE)                    │
│  ├── Auth Webhooks (syncPrismaUser)                             │
│  ├── Storage (not yet used)                                     │
│  ├── Realtime (not yet used)                                    │
│  └── SMTP → Resend (Custom SMTP)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

*Generated: 2026-09-17*