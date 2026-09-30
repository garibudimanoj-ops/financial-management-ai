# Security Hardening Audit — 2026-10-04

**Repository:** `financial-management-ai`  
**Scope:** Local source/configuration review and hardening of authentication, tenant permissions, request boundaries, AI routes, rate limiting, response headers, TLS, and dependencies.  
**Status:** Code changes and local verification complete. Production-provider verification remains a deployment task.

## Findings addressed

| # | Severity | Area | Finding and remediation | Status |
|---|---|---|---|---|
| 1 | 🟠 HIGH | Account linking | Signup previously synchronized an account before email confirmation, and email-based linking did not prove mailbox ownership. Local provisioning now waits for a session; linking requires Supabase-confirmed email, normalizes the address, uses a compare-and-set update, and rejects conflicting concurrent claims. | Fixed; regression tests added |
| 2 | 🟠 HIGH | Serverless rate limiting | A process-local `Map` did not enforce shared limits across Vercel instances. Sensitive auth, callback, AI-ingest, and CA Assistant requests now use Upstash Redis sliding windows. Identifiers are hashed before storage; development/test may use the local fallback, while production fails closed if the service is unavailable or unconfigured. | Fixed in code; Vercel config required |
| 3 | 🟠 HIGH | Dependencies | The lockfile resolved Next.js 16.3.5, within a critical remote-code-execution advisory range. Next.js and its ESLint config are pinned to patched 16.3.8; `npm audit fix` resolved affected transitives without forced upgrades. | Fixed; `npm audit` clean |
| 4 | 🟡 MEDIUM | Inventory authorization | Receiving stock required only `INVENTORY_READ`; product creation could also add inventory using only `PRODUCT_CREATE`. Both stock-in paths now require `INVENTORY_ADJUST` before writes. | Fixed; role regression tests added |
| 5 | 🟡 MEDIUM | Auth callback | Path-prefix redirect checks allowed backslash URL normalization, and production could derive the destination origin from the incoming Host. Redirect targets are parsed and constrained to the configured origin; production now requires a configured HTTPS site URL. | Fixed; adversarial path tests added |
| 6 | 🟡 MEDIUM | AI request limits | AI document ingestion accepted unbounded JSON and loose field types; CA Assistant accepted unbounded prompts and persisted a message preview in audit details. Both routes now enforce streaming byte caps, JSON/schema validation, shared per-user rate limits, and bounded messages. CA Assistant audit records message length instead of prompt text. | Fixed; request-boundary tests added |
| 7 | 🟡 MEDIUM | Content Security Policy | Script execution previously allowed `unsafe-inline`. A per-request nonce CSP now replaces that allowance; Next.js 16 nonce handling is enabled through Proxy, and the root layout opts into dynamic rendering as required by the installed framework. | Fixed; local production browser check passed |
| 8 | 🟡 MEDIUM | Database TLS | The Prisma seed client (and an unused duplicate Prisma client module) disabled TLS certificate verification. Both now require certificate validation and support an optional `SUPABASE_CA_CERT`. | Fixed; no live database used |
| 9 | ⚪ LOW | Health endpoint and logging | Health responses disclosed version, database detail, and timestamp. It now returns only `ok` or generic `unavailable`; production API error logs no longer emit raw exception messages. | Fixed; tests added |

## Deployment requirements

Configure these server-side values in Vercel **for every deployed environment** before relying on protected routes:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_SITE_URL` set to the canonical HTTPS origin (or set `NEXTAUTH_URL` to that HTTPS origin)

Missing rate-limit credentials intentionally cause protected rate-limited operations to fail closed in production; they do not silently fall back to per-instance memory. Do not expose Upstash credentials through `NEXT_PUBLIC_` variables.

Keep the existing server-side Supabase/database/AI provider configuration in Vercel. If the database CA is not in Node's trusted store, configure `SUPABASE_CA_CERT` with its PEM contents; certificate verification must remain enabled.

## Provider-side verification still required

No live Supabase project, Vercel project, or production database was accessed or mutated. Before release:

1. Review Supabase RLS and grants for the actual exposed schemas using staging credentials and the Supabase security advisors. Do not apply a blanket policy migration without checking the Prisma connection role and the application access model.
2. Verify Vercel production and preview environments have the required rate-limit and canonical-site variables.
3. Test signup confirmation, existing-account linking, password reset, and callback behavior against a staging Supabase project.
4. Test a STAFF account against stock-in, initial-stock creation, and other protected workflows.
5. Confirm response CSP and nonce behavior on the deployed domain, and inspect browser console/network results for CSP violations.
6. Verify `/api/health` returns `{"status":"ok"}` when the database is reachable and a generic 503 response when it is not.

## Verification

- `npm test`: **46 test files, 277 tests passed**.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Prisma Client 7.10.0 generated and Next.js 16.3.8 production build completed.
- `npm run lint`: passed with **0 errors and 70 existing warnings**.
- `npm audit`: **0 vulnerabilities**.
- `npm audit signatures`: **559 packages with verified registry signatures; 167 with verified attestations**.
- Local production browser check: `/login` returned 200, rendered with all 14 scripts carrying a CSP nonce, and had no console warnings/errors.

The build emitted a local-only Turbopack warning that a parent-directory lockfile is outside the repository root. The build still completed successfully; confirm the Vercel project root points at this repository when deploying.
