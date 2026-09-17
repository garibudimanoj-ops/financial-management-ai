# Roadmap

## Version Strategy
- **MVP (v1.0)**: Core accounting + invoicing + inventory + auth
- **v1.1**: GST reports, CSV exports, PDF invoices
- **v1.2**: CA Copilot v2, advanced AI, e-invoicing
- **v2.0**: Multi-currency, advanced reporting, API

---

## Current Sprint (v1.0 - MVP)
**Goal**: Production-ready MVP with core accounting, invoicing, inventory, auth

### Completed ✅
- [x] Project setup (Next.js 16, TS, Prisma, Supabase)
- [x] Authentication (signup, login, password reset, email confirmation)
- [x] Multi-tenant architecture (Business, BusinessMember)
- [x] RBAC (OWNER, ADMIN, STAFF)
- [x] Business onboarding (creates Business + BusinessMember OWNER)
- [x] Dashboard with KPIs
- [x] Double-entry accounting engine
- [x] Invoice CRUD + status workflow
- [x] Payment recording (partial/full)
- [x] Customer/Supplier CRUD
- [x] Product/Inventory management (batches, weighted avg cost)
- [x] POS (cart, multi-payment)
- [x] Purchase bills & supplier management
- [x] Expense tracking
- [x] Reports: Trial Balance, P&L, Balance Sheet
- [x] CA Assistant (chat, document ingestion, financial Q&A)
- [x] Audit logging
- [x] CA Assistant (chat, document ingestion, financial Q&A)
- [x] PKCE callback flow (/auth/callback)
- [x] Health endpoint
- [x] Audit log viewer
- [x] Responsive UI (Tailwind 4)
- [x] CI/CD (GitHub Actions, Node 22, Prisma 7)
- [x] Tests: 206 passing
- [x] TypeScript strict, ESLint, Build passing

### In Progress 🔄
- [ ] Dedicated Tax Report page (GSTR-1, GSTR-3B)
- [ ] CSV exports (invoices, payments, customers, inventory)
- [ ] PDF invoice generation
- [ ] Demo seed data (realistic demo data)
- [ ] GST Reports (GSTR-1, GSTR-3B)
- [ ] PDF invoice generation
- [ ] CSV exports (invoices, payments, customers, inventory)
- [ ] Demo seed data
- [ ] GST Reports (GSTR-1, GSTR-3B)
- [ ] PDF invoices
- [ ] CSV exports
- [ ] Demo seed data
- [ ] Billing/Subscription skeleton
- [ ] Full manual smoke test (requires real browser)

### Blocked (External Dependencies) 🚫
- **Full E2E browser verification**: Requires real Supabase SMTP/Resend email delivery
- **Demo seed execution**: Requires manual verification to avoid polluting production data
- **Full manual smoke test**: Requires real browser with LAN access (192.168.1.6:3000)

---

## Next Sprint (v1.1 - Compliance & Exports)
**Target**: 2-3 weeks
**Focus**: Compliance, exports, production hardening

### Must Have
- [ ] GST Reports (GSTR-1, GSTR-3B generation)
- [ ] CSV Exports (Invoices, Payments, Customers, Inventory, Payments)
- [ ] PDF Invoice Generation (professional template)
- [ ] Demo Seed Script (realistic demo data)
- [ ] Billing/Subscription skeleton (Stripe integration prep)
- [ ] CSV Exports (Invoices, Payments, Customers, Inventory, Expenses)
- [ ] PDF Invoice Generation
- [ ] Demo Seed Data (realistic)
- [ ] GST Reports (GSTR-1, GSTR-3B)
- [ ] PDF Invoices
- [ ] CSV Exports
- [ ] Demo Seed Data

### Quality
- [ ] Add rate limiting to auth endpoints
- [ ] Add CSP headers
- [ ] Add structured logging (Pino)
- [ ] Add CSP headers
- [ ] Add database indexes for common queries
- [ ] Add structured logging (Pino)
- [ ] Add database indexes for common queries
- [ ] Add automated DB backup verification

---

## v1.2 - AI Enhancement & Compliance (4-6 weeks)
**Focus**: CA Copilot v2, e-invoicing, advanced compliance

### AI / CA Copilot v2
- [ ] Multi-turn conversation with context
- [ ] Structured data extraction from PDFs/images
- [ ] Anomaly detection (duplicate invoices, unusual amounts)
- [ ] Proactive alerts (cash flow, overdue, tax deadlines)
- [ ] Voice input (whisper integration)

### Compliance
- [ ] E-invoicing (IRN generation, QR code)
- [ ] GSTR-1 JSON generation (Govt schema)
- [ ] GSTR-3B auto-computation
- [ ] HSN/SAC validation
- [ ] TDS calculation & reporting

### Advanced Reporting
- [ ] Cash Flow Statement
- [ ] Budget vs Actual
- [ ] Department/Project P&L
- [ ] Cash Flow Forecasting

---

## v2.0 - Platform & Scale (8-12 weeks)
**Focus**: Multi-currency, API, advanced features

### Platform
- [ ] Public API (REST + Webhooks)
- [ ] Multi-currency support
- [ ] Advanced RBAC (custom roles)
- [ ] White-label / White-glove onboarding
- [ ] Marketplace / App ecosystem

### Advanced Features
- [ ] Multi-entity consolidation
- [ ] Advanced budgeting/forecasting
- [ ] AI-powered forecasting
- [ ] Mobile app (React Native)
- [ ] White-label / Partner portal

---

## Technical Debt & Infrastructure

### Q4 2025
- [ ] Rate limiting on auth endpoints
- [ ] CSP headers
- [ ] Structured logging (Pino)
- [ ] Database indexes for common queries
- [ ] Automated DB backup verification
- [ ] CSP headers

### Q1 2026
- [ ] CSP headers
- [ ] Split `auth.ts` into modules
- [ ] Add rate limiting middleware
- [ ] Add CSP headers
- [ ] Automated DB backup verification

### Q2 2026
- [ ] Domain events / Event sourcing
- [ ] Storybook + Visual regression
- [ ] CSP headers
- [ ] Billing/Subscription integration (Stripe)
- [ ] Public API + Webhooks
- [ ] Multi-currency support

---

## Release Criteria

| Version | Criteria |
|---------|----------|
| **v1.0** | All MVP features working, tests pass, build passes, manual smoke test passes |
| **v1.1** | All v1.0 + GST reports, CSV exports, PDF invoices, demo seed |
| **v1.2** | All v1.1 + e-invoicing, advanced AI, advanced reports |
| **v2.0** | All v1.2 + Public API, multi-currency, white-label |

---

## Release Schedule

| Version | Target Date | Status |
|---------|-------------|--------|
| v1.0 (MVP) | **Current** | 90% complete |
| v1.1 | +3 weeks | Planned |
| v1.2 | +6 weeks | Planned |
| v2.0 | +12 weeks | Planned |

---

## Success Metrics by Version

| Version | Metric | Target |
|---------|--------|--------|
| v1.0 | Time to first invoice | < 5 min |
| v1.0 | Invoice creation time | < 30 sec |
| v1.0 | Dashboard load | < 2s |
| v1.1 | GST report generation | < 5 sec |
| v1.1 | PDF generation | < 3 sec |
| v1.1 | CSV export (10k rows) | < 10 sec |
| v1.2 | E-invoice generation | < 2 sec |
| v2.0 | API response (p95) | < 200ms |

---

*Generated: 2026-09-17*