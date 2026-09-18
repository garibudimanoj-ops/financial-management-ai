# Requirements

## Functional Requirements

### FR-1: Authentication & Authorization
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Email/password signup with email confirmation | P0 |
| FR-1.2 | Email/password login with session management | P0 |
| FR-1.3 | Password reset via email (PKCE flow) | P0 |
| FR-1.4 | Email confirmation flow (PKCE callback) | P0 |
| FR-1.4 | Role-based access control (OWNER, ADMIN, STAFF) | P0 |
| FR-1.5 | Business-scoped data isolation | P0 |
| FR-1.6 | Business membership management (invite, accept, remove) | P1 |
| FR-1.7 | Audit logging for all auth events | P1 |

### Authentication Flows
| Flow | Steps | Success Criteria |
|------|-------|------------------|
| **Signup** | Form → Validation → Supabase signUp → syncPrismaUser → redirect | User created, email sent, redirected to `/login?message=check-email` |
| **Login** | Form → Supabase signInWithPassword → syncPrismaUser → membership check → redirect | Session created, redirected to `/dashboard` or `/onboarding` |
| **Forgot Password** | Email → resetPasswordForEmail → email sent → callback → session → update password | Email sent, user can reset password |
| **Email Confirmation** | Email link → `/auth/callback?code=...` → exchangeCodeForSession → redirect | Session established, redirected appropriately |

### Authorization Rules
| Role | Permissions |
|------|-------------|
| **OWNER** | Full access: business settings, members, all financial data, billing |
| **ADMIN** | Financial data, invoices, payments, expenses, members (no billing) |
| **STAFF** | Limited: create invoices, record payments, view assigned data |

### Business Membership Rules
- User must have ACTIVE membership to access business data
- OWNER cannot be removed if sole owner
- ADMIN cannot remove OWNER
- Membership statuses: ACTIVE, REMOVED, SUSPENDED

---

### FR-2: Business & Onboarding
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | New user completes onboarding after first login | P0 |
| FR-2.2 | Create Business with validation (name, type, address, GSTIN) | P0 |
| FR-2.3 | Auto-create BusinessMember (OWNER, ACTIVE) | P0 |
| FR-2.4 | Initialize Chart of Accounts | P0 |
| FR-2.5 | Set `current_business_id` cookie | P0 |
| FR-2.5 | Redirect to `/dashboard` on success | P0 |
| FR-2.6 | Business settings (GSTIN, address, currency, fiscal year) | P1 |
| FR-2.7 | Business switching (cookie-based) | P1 |
| FR-2.8 | Business invitation flow (PENDING → ACCEPTED) | P1 |

### Onboarding Flow
```
Login → /onboarding → Form Validation → Server Action → Prisma Transaction
  → Create Business
  → Create BusinessMember (OWNER, ACTIVE)
  → Initialize Chart of Accounts
  → Set current_business_id cookie
  → Audit Log (BUSINESS_CREATE)
  → Redirect to /dashboard
```

### Validation Rules
| Field | Rules |
|-------|-------|
| name | Required, 1-100 chars |
| accountType | INDIVIDUAL / COMPANY |
| businessType | RETAIL / SERVICES / WHOLESALE / OTHER |
| country | Required, default "India" |
| state | Required |
| city | Required |
| baseCurrency | INR / USD / EUR |
| fiscalYearStart | APRIL / JANUARY |
| taxRegistrationStatus | boolean |
| taxId | Required if taxRegistrationStatus=true, GSTIN format |

---

### FR-3: Core Financial Operations

#### Invoicing
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Create invoice (draft → issued) | P0 |
| FR-3.2 | GST calculation (CGST/SGST/IGST based on state) | P0 |
| FR-3.3 | HSN/SAC codes per item | P0 |
| FR-3.3 | Invoice sequencing (per business) | P0 |
| FR-3.4 | Invoice status workflow (DRAFT → ISSUED → PARTIALLY_PAID → PAID) | P0 |
| FR-3.5 | Partial payments, overpayment handling | P0 |
| FR-3.4 | Invoice PDF generation | P1 |
| FR-3.5 | E-invoice ready (IRN placeholder) | P2 |

#### Payments
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.5 | Record payment (CASH, CARD, UPI, BANK_TRANSFER) | P0 |
| FR-3.5 | Partial payments, overpayment handling | P0 |
| FR-3.5 | Payment allocation to invoices | P0 |
| FR-3.5 | Refunds (full/partial) with reversal journal | P1 |

#### Customers
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.8 | Customer CRUD (name, contact, GSTIN, address) | P0 |
| FR-3.9 | Customer ledger (running balance) | P0 |
| FR-3.9 | Credit limits, aging reports | P1 |

#### Payments
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.9 | Multiple methods (CASH, CARD, UPI, BANK_TRANSFER) | P0 |
| FR-3.10 | Idempotency keys (prevent duplicate) | P0 |
| FR-3.11 | Payment allocation to invoices | P0 |
| FR-3.12 | Refunds (full/partial) with reversal journal | P1 |

---

### FR-4: Inventory & POS
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Products (SKU, barcode, category, pricing, tax) | P0 |
| FR-4.2 | Weighted average cost (batches) | P0 |
| FR-4.2 | Stock movements (STOCK_IN, SALE, RETURN, ADJUSTMENT) | P0 |
| FR-4.3 | Batch tracking (expiry, cost) | P0 |
| FR-4.4 | Low stock alerts | P1 |
| FR-4.3 | POS (cart, multi-payment, offline queue) | P1 |

### FR-5: Purchases & Expenses
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Purchase Bills (draft → received → paid) | P0 |
| FR-5.2 | Supplier management (GSTIN, credit terms) | P0 |
| FR-5.3 | GRN (Goods Receipt Note) | P1 |
| FR-5.3 | Expense tracking (categories, receipts) | P0 |
| FR-5.4 | Expense categories (tax deductible) | P1 |

### FR-6: Double-Entry Accounting
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Chart of Accounts (auto-provisioned) | P0 |
| FR-6.2 | Journal Entries (Debit/Credit, balanced) | P0 |
| FR-6.3 | Ledger Entries (per account) | P0 |
| FR-6.3 | Trial Balance | P0 |
| FR-6.4 | Profit & Loss Statement | P0 |
| FR-6.5 | Balance Sheet | P0 |
| FR-6.6 | Cash Flow Statement | P1 |
| FR-6.6 | GST Reports (GSTR-1, GSTR-3B) | P1 |

---

### FR-7: Inventory & POS
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Products (SKU, barcode, category, pricing, tax) | P0 |
| FR-7.2 | Weighted average cost (batches) | P0 |
| FR-7.2 | Stock movements (STOCK_IN, SALE, RETURN, ADJUSTMENT) | P0 |
| FR-7.3 | Batch tracking (expiry, cost) | P0 |
| FR-7.4 | Low stock alerts | P1 |
| FR-7.3 | POS (cart, multi-payment, offline queue) | P1 |

### FR-8: Reports
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | Trial Balance | P0 |
| FR-8.2 | Profit & Loss | P0 |
| FR-8.3 | Balance Sheet | P0 |
| FR-8.4 | GST Reports (GSTR-1, GSTR-3B) | P1 |
| FR-8.4 | Aging Reports (AR/AP) | P1 |

### FR-8: AI / CA Copilot
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | Chat interface (multi-turn, context-aware) | P0 |
| FR-8.2 | Financial Q&A (sales, expenses, balances) | P0 |
| FR-8.3 | Draft generation (invoices, expenses, payments) | P0 |
| FR-8.4 | Document ingestion (PDF → structured data) | P1 |
| FR-8.5 | Anomaly detection (duplicates, anomalies) | P1 |

---

### FR-9: Multi-Tenancy & Security
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-9.1 | Strict business-scoped isolation | P0 |
| FR-9.2 | RBAC (OWNER, ADMIN, STAFF) | P0 |
| FR-9.3 | Audit logging for all mutations | P0 |
| FR-9.4 | Decimal-safe financial calculations | P0 |
| FR-9.5 | Idempotency keys on mutations | P1 |

---

### FR-10: Reporting & Exports
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10.1 | CSV exports (invoices, payments, customers) | P1 |
| FR-10.2 | PDF invoices | P1 |
| FR-10.3 | GST Returns (GSTR-1, GSTR-3B) | P1 |

---

## Non-Functional Requirements

### NFR-1: Performance
| Requirement | Target |
|-------------|--------|
| Page Load (Dashboard) | < 2s |
| API Response (p95) | < 500ms |
| Build Time | < 5 min |
| Test Suite | < 60s |

### NFR-2: Scalability
- 10,000+ businesses
- 1M+ invoices
- 100k+ products per business
- Horizontal scaling via Vercel + Supabase

### NFR-3: Security
- Zero trust architecture
- All mutations via Server Actions
- Strict tenant isolation
- Decimal arithmetic for money
- Immutable ledger entries

### NFR-4: Compliance
- GST (India) compliance
- Audit trail (immutable)
- GDPR-ready (data export, deletion)
- Decimal arithmetic (no float)

---

## Acceptance Criteria (MVP)

| Feature | Criteria |
|---------|----------|
| **Signup** | Creates user, sends confirmation email, redirects to `/login?message=check-email` |
| **Login** | Valid credentials → session → redirect to `/onboarding` or `/dashboard` |
| **Forgot Password** | Sends email, redirect to `/auth/callback?next=/reset-password` |
| **Reset Password** | Valid recovery session → password update → redirect to `/login` |
| **Signup → Login → Onboarding** | Creates Business + BusinessMember(OWNER) → `/dashboard` |
| **Dashboard** | `requireBusinessContext()` succeeds, shows KPIs |
| **Invoice** | Creates draft → issue → payment → PAID |
| **Payment** | Partial + full payments, updates invoice status |
| **Inventory** | Stock movements update batch quantities correctly |
| **Reports** | Trial Balance balances (Debits = Credits) |

---

*Generated: 2026-09-17*