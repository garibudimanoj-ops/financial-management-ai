# Concerns & Technical Debt

## Critical Risks (P0)

### 1. **Email Confirmation Flow Fragility**
- **Risk**: Email confirmation flow depends on Supabase PKCE callback working correctly
- **Impact**: Users stuck in "check email" state if callback fails
- **Location**: `/auth/callback/route.ts`, `src/actions/auth.ts:signup`
- **Mitigation**: Add comprehensive logging, improve error messaging, add fallback for manual confirmation

### 2. **Password Reset PKCE Flow**
- **Risk**: Password recovery relies on PKCE callback; middleware may redirect recovery sessions
- **Impact**: Users unable to reset passwords
- **Location**: `/auth/callback/route.ts`, middleware.ts, `reset-password/page.tsx`
- **Status**: Partially addressed - callback route implemented, needs E2E verification

### 3. **Business Context Loss**
- **Risk**: Users lose `current_business_id` cookie, `requireBusinessContext` throws "No business context"
- **Impact**: Authenticated users cannot access dashboard
- **Location**: `src/lib/auth.ts:requireBusinessContext`, `middleware.ts`
- **Mitigation**: Improved fallback to first active membership (implemented)

### 4. **Prisma Decimal Precision in Aggregations**
- **Risk**: Floating-point drift in financial calculations if Decimal not used consistently
- **Impact**: Financial discrepancies in reports, ledgers
- **Location**: All accounting services, `src/services/accounting/`
- **Mitigation**: Enforce `Prisma.Decimal` everywhere, add lint rule

---

## High Risks (P1)

### 5. **Missing Email Confirmation Bypass for Development**
- **Risk**: No way to bypass email confirmation in development
- **Impact**: Slow development iteration
- **Location**: `src/actions/auth.ts`, Supabase dashboard
- **Mitigation**: Add `EMAIL_CONFIRMATION_REQUIRED=false` env var for dev

### 6. **No Rate Limiting on Auth Endpoints**
- **Risk**: Brute force attacks on login/signup/password reset
- **Impact**: Account takeover, email enumeration
- **Location**: `src/actions/auth.ts`, middleware
- **Mitigation**: Add rate limiting (planned: `src/lib/rateLimit.ts` exists but not integrated)

### 7. **No CSRF Protection on Server Actions**
- **Risk**: CSRF attacks on server actions (though Next.js has built-in protection)
- **Impact**: Potential CSRF vulnerabilities
- **Mitigation**: Verify Next.js built-in CSRF protection is active for Server Actions

### 8. **No Audit Log Retention Policy**
- **Risk**: Audit logs grow unbounded
- **Impact**: Database bloat, compliance issues
- **Location**: `prisma/schema.prisma` (AuditLog model), `lib/audit.ts`
- **Mitigation**: Implement retention policy (e.g., 7 years for financial, 1 year for auth)

---

## Medium Risks (P2)

### 9. **Missing Database Indexes for Common Queries**
- **Risk**: Slow queries on large datasets
- **Impact**: Slow dashboard loads, timeouts
- **Location**: `prisma/schema.prisma`
- **Examples**: 
  - `Invoice` missing composite index on `(businessId, status, issueDate)`
  - `Payment` missing index on `(businessId, createdAt)`
  - `InventoryMovement` missing composite index

### 10. **No Database Connection Pool Monitoring**
- **Risk**: Connection pool exhaustion under load
- **Impact**: Request failures, 500 errors
- **Location**: `prisma.config.ts`, `prisma.ts`
- **Mitigation**: Add connection pool monitoring, alerting

### 11. **No Structured Logging / Observability**
- **Risk**: Difficult debugging in production
- **Impact**: Slow incident resolution
- **Location**: Throughout codebase (`console.log` statements)
- **Mitigation**: Implement structured logging (Pino/Winston), correlation IDs

### 12. **No API Rate Limiting on Public Endpoints**
- **Risk**: Abuse of `/api/ai/ingest`, `/api/health`
- **Impact**: Resource exhaustion, cost overruns
- **Location**: `src/app/api/`, middleware

### 13. **No Input Sanitization for Rich Text**
- **Risk**: XSS via invoice notes, customer notes, product descriptions
- **Impact**: XSS attacks
- **Location**: All text inputs in forms
- **Mitigation**: DOMPurify on client, server-side sanitization

### 14. **No Automated Database Backup Verification**
- **Risk**: Backups may be corrupted/incomplete
- **Impact**: Data loss on disaster
- **Mitigation**: Automated restore tests (Supabase handles, but verify)

### 15. **No Content Security Policy (CSP)**
- **Risk**: XSS via injected scripts
- **Impact**: Account takeover, data theft
- **Mitigation**: Implement CSP headers in `next.config.ts`

---

## Low Risks (P3)

### 15. **Bundle Size Growth**
- **Risk**: Large client bundle affects FCP/TTI
- **Impact**: Poor UX on slow connections
- **Mitigation**: Code splitting, dynamic imports, bundle analyzer

### 16. **No Storybook / Visual Regression Testing**
- **Risk**: UI regressions undetected
- **Impact**: Visual bugs in production
- **Mitigation**: Add Storybook + Chromatic

### 16. **No Database Migration Rollback Testing**
- **Risk**: Failed migration leaves DB in broken state
- **Mitigation**: Test rollbacks in CI

---

## Security Risks

| Risk | Severity | Status |
|------|----------|--------|
| SQL Injection | Low (Prisma parameterized queries) | Mitigated |
| XSS | Medium (Rich text inputs) | Partially mitigated |
| CSRF | Low (Next.js built-in) | Verified |
| IDOR | Low (Business scoping) | Mitigated |
| Broken Access Control | Low (RBAC + middleware) | Verified |
| Security Misconfiguration | Medium (CSP missing) | Open |
| Vulnerable Dependencies | Low (Dependabot) | Automated |
| Insecure Deserialization | Low (Zod validation) | Mitigated |
| Insufficient Logging | High (No structured logs) | Open |
| SSRF | Low (No outbound fetch) | Low risk |

---

## Performance Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| N+1 queries in reports | High | Use `include` / `select` |
| Large invoice lists without pagination | High | Implement cursor pagination |
| Chart rendering blocking main thread | Medium | Web Workers / Server-side rendering |
| Large PDF generation blocking | Medium | Queue + background job |
| Unoptimized images | Medium | Next.js Image + optimization |

---

## Compliance Gaps

| Requirement | Status | Gap |
|-------------|--------|-----|
| GDPR (Right to erasure) | Partial | No automated deletion |
| GST Compliance (India) | Partial | HSN/SAC codes, GSTIN validation needed |
| Audit Trail Retention | Partial | No retention policy |
| Data Encryption at Rest | Yes (Supabase) | Verified |
| Data Encryption in Transit | Yes (TLS 1.3) | Verified |
| SOC 2 Type II | Not Started | Future |

---

## Technical Debt by Component

### `src/lib/auth.ts`
- [ ] Split into smaller modules (`syncUser.ts`, `businessContext.ts`, `rbac.ts`)
- [ ] Add JSDoc for all public functions
- [ ] Add unit tests for `requireBusinessContext` edge cases

### `src/actions/auth.ts`
- [ ] Add rate limiting
- [ ] Add email confirmation bypass for dev
- [ ] Consolidate duplicate `siteUrl` logic

### `src/lib/auth.ts`
- [ ] Split into modules (`syncUser.ts`, `businessContext.ts`, `rbac.ts`)
- [ ] Remove `console.log` statements (replace with logger)

### `src/actions/business.ts`
- [ ] Add validation for GSTIN format
- [ ] Add idempotency key support

### `src/services/accounting/`
- [ ] Add integration tests for journal balancing
- [ ] Verify Decimal precision in all calculations

---

## Architecture Debt

### Monolithic Server Actions
- **Issue**: All mutations in single files per domain
- **Impact**: Large files, harder to test
- **Fix**: Split by operation type (`createInvoice.ts`, `updateInvoice.ts`)

### Tight Coupling to Supabase
- **Issue**: Direct `supabase.auth` calls in actions
- **Impact**: Hard to test, vendor lock-in
- **Fix**: Repository pattern / adapter layer

### No Domain Events
- **Issue**: No event-driven architecture
- **Impact**: Tight coupling, hard to add features
- **Fix**: Domain event bus (future)

---

## Dependency Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| `@supabase/ssr` | Breaking changes | Pin version, test on upgrade |
| `prisma` | Breaking schema changes | Pin version, test migrations |
| `zod` | Breaking API changes | Pin major version |
| `next` | Breaking changes | Pin major, test on RC |
| `react` | Breaking changes | Pin major, test on RC |
| `resend` | API changes | Monitor changelog |

---

## Upgrade Priorities

### P0 (Immediate)
1. Fix password reset PKCE flow (verify callback works)
2. Add rate limiting to auth endpoints
2. Add email confirmation bypass for development
3. Add CSP headers

### P1 (This Sprint)
1. Add rate limiting to auth endpoints
2. Add database indexes for common queries
3. Add structured logging (Pino)
4. Add CSP headers
5. Add automated DB backup verification

### P2 (Next Sprint)
1. Add CSP headers
2. Add automated DB backup verification
2. Split `auth.ts` into modules
3. Add rate limiting middleware
4. Add CSP headers
5. Add automated DB backup verification

### P3 (Future)
1. Add domain events
2. Add Storybook
3. Add visual regression testing
4. Implement CSP
5. Split `auth.ts`

---

*Generated: 2026-09-17*