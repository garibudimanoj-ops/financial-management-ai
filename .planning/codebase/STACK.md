# Technology Stack

## Core Framework
- **Framework**: Next.js 16.3.2 (App Router, Server Components, Server Actions)
- **React**: 19
- **TypeScript**: 5.x (strict mode)
- **Language**: TypeScript 5.x (strict mode)

## Database & ORM
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 7.9 (`@prisma/client`, `@prisma/adapter-pg`)
- **Database Provider**: Supabase PostgreSQL
- **Connection Pooling**: Supabase PgBouncer (via `@prisma/adapter-pg`)
- **Migrations**: Prisma Migrate

## Authentication & Authorization
- **Auth Provider**: Supabase Auth
- **Auth Integration**: `@supabase/ssr` (Server-Side Rendering support)
- **Session Management**: Cookie-based (Supabase SSR)
- **Authentication Methods**: Email/Password, Magic Links (implied)
- **Authorization**: RBAC (OWNER, ADMIN, STAFF roles) with business-scoped permissions
- **Authorization Library**: Custom (`src/lib/permissions.ts`)

## UI & Styling
- **CSS Framework**: Tailwind CSS 4.x
- **Component Library**: Custom (no external UI library)
- **Icons**: Lucide React
- **Forms**: React Hook Form (implied by form patterns)

## State Management
- **Server State**: Server Components + Server Actions
- **Client State**: React hooks (useState, useTransition, useFormState)
- **Form Handling**: React Hook Form (implied) / Native FormData

## Testing
- **Test Framework**: Vitest
- **Test Environment**: jsdom (implied)
- **Test Coverage**: ~206 tests across 28 files

## Build & Deployment
- **Build Tool**: Next.js built-in (Turbopack in dev)
- **Package Manager**: npm
- **Linting**: ESLint (Next.js recommended config)
- **Type Checking**: TypeScript (`tsc --noEmit`)

## Integrations
- **Auth**: Supabase Auth (Email/Password, Magic Links, PKCE)
- **Email**: Resend (via Supabase SMTP)
- **Database**: Supabase PostgreSQL (Supabase-hosted)
- **File Storage**: Not currently implemented (placeholder)
- **Real-time**: Not currently implemented

## Development Tools
- **Package Manager**: npm
- **Node Version**: 20.x+ (implied by Next.js 16)
- **Git**: Standard Git workflow
- **IDE**: VS Code (implied by .vscode configs)

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `NEXTAUTH_URL` | Base URL for auth redirects (local: http://localhost:3000) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL for email redirects (LAN: http://192.168.1.6:3000) |

## File Structure (Key Directories)
```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/            # Auth pages (login, signup, forgot-password, reset-password)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes (auth/callback, ai/ingest, health)
│   └── (modules)/         # Feature modules (invoices, customers, products, etc.)
├── actions/               # Server Actions (auth, business, invoices, etc.)
├── components/            # React components (UI, forms, POS, etc.)
├── lib/                   # Shared utilities, clients, auth, permissions
│   ├── auth.ts            # Core auth logic (sync, business context, RBAC)
│   ├── auth.test.ts       # Auth tests
│   ├── permissions.ts     # RBAC permissions system
│   ├── permissions.test.ts
│   ├── supabase/          # Supabase client/server/middleware
│   ├── prisma.ts          # Prisma client singleton
│   ├── permissions.ts     # RBAC permissions
│   ├── auth.ts            # Auth utilities
│   ├── audit.ts           # Audit logging
│   ├── prisma.ts          # Prisma client
│   ├── serialize.ts       # Serialization utilities
│   └── errors.ts          # Custom error classes
├── services/              # Business logic services (accounting, inventory, etc.)
├── components/            # Shared React components
├── types/                 # TypeScript type definitions
├── middleware.ts          # Next.js middleware (auth session refresh)
└── types/                 # Shared TypeScript types
```

---

*Generated: 2026-09-17*