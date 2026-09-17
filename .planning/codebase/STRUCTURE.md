# Project Structure

## Root Directory
```
financial-management-ai/
├── .github/workflows/          # CI/CD workflows
├── .agents/skills/             # Agent skills (Prisma, Supabase)
├── .planning/                  # Planning documents (this directory)
├── .github/                    # GitHub workflows
├── prisma/                     # Prisma schema & migrations
├── public/                     # Static assets
├── scripts/                    # Utility scripts (auth testing, db checks)
├── src/                        # Main source code
├── .env                        # Environment variables (committed - template)
├── .env.example                # Environment template
├── .env.local                  # Local environment (gitignored)
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── README.md
└── AGENTS.md
```

---

## Source Code Structure (`src/`)

```
src/
├── actions/                          # Server Actions (mutations)
│   ├── auth.ts                       # Authentication (signup, login, reset, etc.)
    ├── business.ts                   # Business/onboarding/membership
    ├── invoices.ts                   # Invoice CRUD + workflows
    ├── customers.ts                  # Customer management
    ├── products.ts                   # Product/inventory management
    ├── payments.ts                   # Payment processing
    ├── purchases.ts                  # Purchase orders/bills
    ├── expenses.ts                   # Expense tracking
    ├── suppliers.ts                  # Supplier management
    ├── reports.ts                    # Financial reports
    ├── inventory.ts                  # Inventory management
    ├── accounting/                   # Double-entry accounting
    │   ├── journal.ts                # Journal entries
    │   ├── ledger.ts                 # Ledger operations
    │   ├── reports.ts                # Financial reports
    │   └── accounts.ts               # Chart of accounts
    └── ai/                           # AI ingestion/processing
        └── ingest.ts
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Global styles (Tailwind)
│   ├── (auth)/                       # Auth route group
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── auth/                         # Auth routes
│   │   └── callback/                 # PKCE callback handler
│   ├── (dashboard)/                  # Protected dashboard routes
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   ├── page.tsx                  # Dashboard overview
│   │   ├── invoices/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── pos/                      # Point of Sale
│   │   ├── payments/
│   │   ├── purchases/
│   │   ├── expenses/
│   │   ├── suppliers/
│   │   ├── inventory/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── audit-logs/
│   ├── onboarding/                   # Business onboarding
│   │   └── page.tsx
│   ├── api/                          # API Routes
│   │   ├── auth/callback/            # PKCE callback
│   │   ├── ai/ingest/                # AI document ingestion
│   │   └── health/                   # Health check
│   ├── auth/                         # Auth pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── ca-assistant/                 # CA Assistant chat UI
│   ├── dashboard/                    # Dashboard overview
│   ├── dashboard/                    # Dashboard (legacy)
│   └── page.tsx                      # Landing page
├── components/                        # React Components
│   ├── ui/                            # Base UI components
│   ├── forms/                         # Form components
│   ├── tables/                        # Table components
│   ├── charts/                        # Chart components
│   ├── pos/                           # POS-specific components
│   ├── invoices/                      # Invoice components
│   ├── customers/                     # Customer components
│   ├── products/                      # Product components
│   ├── inventory/                     # Inventory components
│   ├── pos/                           # POS components
│   ├── ca-assistant/                  # CA Assistant components
│   ├── dashboard/                     # Dashboard widgets
│   ├── forms/                         # Form components
│   ├── tables/                        # Table components
│   ├── charts/                        # Chart components
│   └── ui/                           # Base UI primitives
├── lib/                              # Shared utilities
│   ├── auth.ts                       # Core auth logic
│   ├── auth.test.ts                  # Auth unit tests
│   ├── permissions.ts                # RBAC permission matrix
│   ├── permissions.test.ts
│   ├── supabase/                     # Supabase clients
│   │   ├── server.ts                 # Server client (SSR)
│   │   ├── client.ts                 # Client-side client
│   │   └── middleware.ts             # Middleware session refresh
│   ├── auth.ts                       # Core auth utilities (sync, context, RBAC)
│   ├── auth.test.ts                  # Auth unit tests
│   ├── permissions.ts                # RBAC permissions
│   ├── permissions.test.ts
│   ├── supabase/                     # Supabase clients
│   │   ├── server.ts                 # Server client
│   │   ├── client.ts                 # Client-side client
│   │   └── middleware.ts             # Middleware
│   ├── audit.ts                      # Audit logging
│   ├── prisma.ts                     # Prisma client singleton
│   ├── serialize.ts                  # Serialization utilities
│   ├── errors.ts                     # Custom error classes
│   ├── apiResponse.ts                # API response helpers
│   ├── errors.ts                     # Custom error classes
│   ├── audit.ts                      # Audit logging
│   ├── prisma.ts                     # Prisma client
│   ├── serialize.ts                  # Serialization
│   ├── errors.ts                     # Custom errors
│   └── apiResponse.ts                # API responses
├── services/                          # Business logic services
│   ├── accounting/                   # Accounting engine
│   │   ├── journal.ts                # Journal entries
│   │   ├── ledger.ts                 # General ledger
│   │   ├── reports.ts                # Financial statements
│   │   ├── accounts.ts               # Chart of accounts
│   │   └── inventory/                # Inventory valuation
│   ├── inventory/                    # Inventory services
│   │   ├── valuation.ts              # Weighted average cost
│   │   └── movements.ts              # Stock movements
│   ├── ai/                           # AI services
│   │   └── ingest.ts                 # Document ingestion
│   └── pos/                          # POS services
├── components/                        # Shared React components
│   ├── ui/                           # Base UI primitives (Button, Input, etc.)
│   ├── forms/                        # Form components
│   ├── tables/                       # Data tables
│   ├── charts/                       # Charts (Recharts)
│   ├── forms/                        # Form components
│   ├── tables/                       # Data tables
│   ├── charts/                       # Charts
│   ├── pos/                          # POS components
│   ├── invoices/                     # Invoice components
│   ├── customers/                    # Customer components
│   ├── products/                     # Product components
│   ├── inventory/                    # Inventory components
│   ├── pos/                          # POS components
│   ├── ca-assistant/                 # CA Assistant chat
│   ├── dashboard/                    # Dashboard widgets
│   ├── forms/                        # Form components
│   ├── tables/                       # Data tables
│   ├── charts/                       # Charts
│   └── ui/                           # Base UI primitives
├── services/                          # Business logic services
│   ├── accounting/                   # Accounting engine
│   ├── inventory/                    # Inventory services
│   ├── ai/                           # AI services
│   └── pos/                          # POS services
├── types/                            # TypeScript types
│   ├── auth.ts                       # Auth types
│   ├── business.ts                   # Business types
│   ├── invoices.ts                   # Invoice types
│   ├── products.ts                   # Product types
│   └── index.ts
├── middleware.ts                     # Next.js middleware
└── types/                            # Shared types
    ├── auth.ts
    ├── business.ts
    ├── invoices.ts
    └── index.ts
```

---

## Key Directories Explained

### `src/actions/` - Server Actions
All mutations are Server Actions. Each file corresponds to a domain:
- `auth.ts` - Authentication (signup, login, logout, password reset)
- `business.ts` - Business/onboarding/membership management
- `invoices.ts` - Invoice CRUD, workflows, PDF generation
- `customers.ts` - Customer CRUD
- `products.ts` - Product/inventory management
- `payments.ts` - Payment processing
- `purchases.ts` - Purchase orders/bills
- `expenses.ts` - Expense tracking
- `suppliers.ts` - Supplier management
- `reports.ts` - Financial reports
- `inventory.ts` - Inventory management
- `accounting/` - Double-entry accounting engine

### `src/app/` - Next.js App Router
Organized by route groups:
- `(auth)` - Public auth pages (login, signup, forgot-password, reset-password)
- `(dashboard)` - Protected routes requiring authentication + business context
- `api/` - API routes (auth callback, AI ingest, health)
- Feature modules: invoices, customers, products, inventory, pos, payments, etc.

### `src/lib/` - Shared Infrastructure
Core infrastructure shared across the application:
- `auth.ts` - Core auth logic (sync, business context, RBAC)
- `permissions.ts` - RBAC permission matrix
- `supabase/` - Supabase clients (server, client, middleware)
- `prisma.ts` - Prisma client singleton
- `auth.ts` - Core auth utilities
- `audit.ts` - Audit logging
- `serialize.ts` - Serialization utilities
- `errors.ts` - Custom error classes

### `src/services/` - Business Logic Services
Domain services containing business logic:
- `accounting/` - Double-entry accounting engine
- `inventory/` - Inventory valuation, movements
- `ai/` - AI document ingestion
- `pos/` - Point of Sale services

### `src/components/` - React Components
Organized by feature/domain:
- `ui/` - Base primitives (Button, Input, Card, etc.)
- Feature-specific: `invoices/`, `customers/`, `products/`, `pos/`, etc.

---

*Generated: 2026-09-17*