# MASTER PROMPT — INDUSTRY-GRADE VIRTUAL CA + BUSINESS FINANCE OPERATING SYSTEM

You are the lead architect, senior full-stack engineer, database engineer, accounting-domain engineer, security engineer, QA engineer, and product engineer for this project.

You are working on an EXISTING codebase:

`financial-management-ai`

Do NOT rebuild the application from scratch.

Your job is to inspect the existing repository, understand what is already implemented, preserve working functionality, identify weaknesses, and progressively transform the current application into a production-grade, industry-level financial management, accounting, inventory, taxation, compliance, business intelligence, and AI-assisted CA platform.

The product vision is:

> A unified financial operating system for Indian business owners, shop owners, entrepreneurs, professionals, and salaried individuals that automates accounting, invoicing, inventory, GST, banking, payroll, tax preparation assistance, compliance tracking, financial analysis, and AI-powered financial guidance.

The system should function as a highly capable **Virtual CA / CFO Assistant**, while keeping regulated professional actions, statutory certification, and legally required human review/sign-off under appropriate professional control.

---

# 1. NON-NEGOTIABLE ENGINEERING RULES

Before changing anything:

1. Inspect the entire repository.
2. Inspect:

   * package.json
   * Prisma schema
   * migrations
   * seed files
   * environment configuration
   * authentication
   * authorization
   * database layer
   * server actions
   * API routes
   * services
   * components
   * pages
   * tests
   * configuration
   * existing documentation
3. Understand the current architecture before implementing.
4. Do not duplicate existing functionality.
5. Do not replace working implementations unnecessarily.
6. Do not remove existing features just to simplify development.
7. Preserve backward compatibility wherever practical.
8. Do not expose secrets.
9. Never hard-code credentials, API keys, passwords, JWT secrets, Supabase secrets, or database credentials.
10. Never trust client-provided:

    * business IDs
    * user IDs
    * roles
    * permissions
    * prices
    * tax calculations
    * accounting balances
11. Every tenant-sensitive query must enforce business/tenant ownership server-side.
12. Financial calculations must be deterministic and testable.
13. Never allow an LLM to directly determine authoritative accounting or tax figures.
14. AI suggestions must pass through deterministic validation before becoming financial records.
15. Use database transactions for financial operations requiring atomicity.
16. Use idempotency for operations that could accidentally create duplicate financial records.
17. Maintain an audit trail for important financial mutations.
18. Never silently swallow errors.
19. Never use mock data in production paths unless explicitly identified as demo/sample data.
20. Do not declare a feature complete merely because the UI exists.
21. Every feature must include:

    * database model if required
    * backend/domain logic
    * authorization
    * validation
    * UI
    * error handling
    * tests
    * auditability where applicable

---

# 2. CURRENT PROJECT MUST BE TREATED AS THE FOUNDATION

The existing project already contains substantial work around:

* Authentication
* Supabase integration
* Prisma
* PostgreSQL/Supabase
* RBAC
* Multi-tenant business context
* Inventory
* Product management
* Accounting
* Double-entry transactions
* Accounting reports
* AI engine
* Customer management
* Invoices
* Payments
* CA Copilot work

There has also been a TLS/database connection compatibility fix using:

* `pg`
* `PrismaPg`
* `ssl: { rejectUnauthorized: false }`

Do not undo this blindly.

The authentication synchronization layer has also been improved so Supabase users can be linked to existing Prisma users by email while preserving their business memberships.

Do not regress this behavior.

The current branch has already passed:

* `npx tsc --noEmit`
* `npm test`
* 55/55 tests passing across 9 suites

Treat this as the current quality baseline.

After every significant implementation phase:

```bash
npx tsc --noEmit
npm test
```

must pass.

If tests fail because of your change, fix them before moving forward.

---

# 3. FIRST TASK — COMPLETE REPOSITORY AUDIT

Before implementing major features, perform a complete audit.

Create an internal implementation map containing:

## Architecture

* frontend framework
* backend architecture
* database architecture
* authentication
* authorization
* tenant isolation
* state management
* validation
* error handling
* logging
* testing
* deployment configuration

## Existing modules

Identify exactly what exists for:

* authentication
* businesses
* users
* roles
* permissions
* products
* inventory
* customers
* suppliers
* invoices
* payments
* accounting
* AI
* reports
* dashboard
* documents
* CA Copilot

## Database

Inspect every Prisma model and identify:

* missing relations
* missing indexes
* incorrect uniqueness constraints
* tenant-isolation weaknesses
* missing audit fields
* missing timestamps
* unsafe deletion behavior
* financial precision problems
* enum weaknesses
* missing status fields

## Frontend

Identify:

* incomplete pages
* broken navigation
* placeholder UI
* fake data
* missing loading states
* missing empty states
* missing error states
* accessibility issues
* inconsistent components
* mobile responsiveness problems

## Backend

Identify:

* incomplete actions
* missing authorization
* duplicated logic
* missing transactions
* missing validation
* missing idempotency
* race conditions
* unsafe queries
* inconsistent error handling

## Testing

Identify:

* current coverage
* untested critical workflows
* missing integration tests
* missing authorization tests
* missing tenant-isolation tests
* missing accounting invariant tests

Do not start a large rewrite until this audit is complete.

---

# 4. TARGET PRODUCT ARCHITECTURE

The application should evolve toward the following modular architecture:

```text
src/
├── app/
├── modules/
│   ├── identity/
│   ├── businesses/
│   ├── accounting/
│   ├── sales/
│   ├── purchases/
│   ├── inventory/
│   ├── customers/
│   ├── suppliers/
│   ├── banking/
│   ├── gst/
│   ├── income-tax/
│   ├── payroll/
│   ├── assets/
│   ├── documents/
│   ├── compliance/
│   ├── reporting/
│   ├── forecasting/
│   ├── notifications/
│   └── ca-copilot/
│
├── services/
├── infrastructure/
│   ├── database/
│   ├── auth/
│   ├── storage/
│   ├── integrations/
│   └── jobs/
│
├── components/
├── lib/
└── types/
```

Do not blindly move everything immediately.

Refactor incrementally when touching existing modules.

---

# 5. CORE BUSINESS MODEL

The system must support multiple businesses per user.

A user may be:

* OWNER
* ADMIN
* ACCOUNTANT
* MANAGER
* STAFF
* VIEWER
* CA / PROFESSIONAL
* AUDITOR

Business data must always be tenant-isolated.

A user must only access businesses for which they have an active authorized membership.

Implement strong server-side authorization.

---

# 6. ACCOUNTING ENGINE

Build a serious double-entry accounting engine.

Required capabilities:

* Chart of Accounts
* Account groups
* Journal entries
* Journal lines
* General Ledger
* Trial Balance
* Profit & Loss
* Balance Sheet
* Cash Flow Statement
* Accounts Receivable
* Accounts Payable
* Cash Book
* Bank Book
* Opening balances
* Closing balances
* Fiscal years
* Accounting periods
* Period locking
* Reversal entries
* Adjusting entries
* Recurring entries
* Journal numbering
* Audit trail

Rules:

```text
Total Debits = Total Credits
```

must always hold for posted double-entry transactions.

Prevent modification of posted transactions unless an approved reversal/adjustment mechanism is used.

Use Decimal/database numeric types for money.

Never use JavaScript floating-point arithmetic for authoritative monetary calculations.

---

# 7. SALES SYSTEM

Implement complete:

```text
Quotation
↓
Sales Order
↓
Delivery
↓
Invoice
↓
Payment
↓
Receipt
↓
Ledger
↓
Accounting
```

Support:

* customers
* GSTIN
* addresses
* billing/shipping
* products
* services
* discounts
* tax
* payment terms
* due dates
* partial payments
* full payments
* overdue invoices
* recurring invoices
* credit notes
* debit notes
* cancelled invoices
* invoice numbering
* PDF generation
* printing
* email sharing
* WhatsApp-ready sharing

Every invoice must produce correct accounting entries.

---

# 8. PURCHASE SYSTEM

Implement:

```text
Supplier
↓
Purchase Order
↓
Goods Receipt
↓
Purchase Bill
↓
Payment
↓
Ledger
↓
Accounting
```

Support:

* suppliers
* purchase orders
* purchase bills
* purchase returns
* debit notes
* input GST
* expenses
* supplier balances
* payment due dates
* outstanding reports

---

# 9. INVENTORY SYSTEM

Expand the existing inventory implementation.

Support:

* products
* categories
* brands
* units
* warehouses
* stock locations
* batches
* expiry dates
* serial numbers
* barcodes
* QR codes
* opening stock
* stock purchases
* stock sales
* stock transfers
* stock adjustments
* damaged stock
* returned stock
* stock reconciliation

Valuation:

* Weighted Average
* FIFO where appropriate

Provide:

* inventory valuation
* stock movement history
* low-stock alerts
* dead-stock detection
* expiry alerts
* inventory turnover
* reorder recommendations

Inventory and accounting must remain synchronized.

---

# 10. POS SYSTEM

Create a professional POS terminal.

Features:

* barcode scanner
* product search
* cart
* quantity adjustment
* discounts
* GST
* customer selection
* cash
* card
* UPI
* split payments
* credit sales
* receipt generation
* thermal receipt
* return/refund
* invoice creation
* inventory deduction
* accounting entry
* idempotency

The POS must remain usable even for fast counter sales.

---

# 11. GST ENGINE

Create a dedicated GST domain module.

Do NOT scatter GST calculations throughout the application.

Build a centralized tax engine.

Support:

* CGST
* SGST
* IGST
* UTGST
* input tax
* output tax
* ITC
* GST payable
* GSTIN
* HSN
* SAC
* tax rates
* place of supply
* reverse charge
* exempt supplies
* zero-rated supplies
* non-GST supplies
* credit/debit notes
* tax-period calculations

Reports/preparation support:

* GSTR-1
* GSTR-3B
* purchase/input reconciliation
* sales/output reconciliation
* tax liability
* ITC summary

Where government/API integration is required, isolate the integration behind an adapter/service interface.

Never invent government API behavior.

---

# 12. GST RECONCILIATION

Create reconciliation workflows.

Example:

```text
Books
   ↓
Purchase Register
   ↓
External GST Data
   ↓
Match
   ├── Exact
   ├── Partial
   ├── Missing
   ├── Duplicate
   └── Mismatch
```

Show:

* invoice mismatch
* GSTIN mismatch
* tax mismatch
* amount mismatch
* date mismatch
* missing invoices
* duplicate invoices

Allow user/accountant/CA review.

---

# 13. BANKING MODULE

Create:

* bank accounts
* opening balance
* transactions
* statement imports
* CSV
* Excel
* supported formats
* automatic categorization
* transaction matching
* reconciliation

Workflow:

```text
Bank Statement
↓
Import
↓
Normalize
↓
Detect duplicates
↓
Categorize
↓
Match invoices/payments
↓
Suggest accounting
↓
User approval
↓
Post transaction
```

Do not automatically post uncertain transactions.

---

# 14. EXPENSE MANAGEMENT

Support:

* expense categories
* expense entry
* recurring expenses
* receipts
* document upload
* GST
* vendor
* employee reimbursement
* approval workflows
* expense reports

AI may classify receipts but deterministic validation must occur before posting.

---

# 15. ASSET MANAGEMENT

Support:

* fixed assets
* purchase
* capitalization
* asset categories
* depreciation
* disposal
* transfer
* impairment
* asset register

Support configurable depreciation methods according to applicable accounting/tax requirements.

Keep book depreciation and tax depreciation conceptually separate where required.

---

# 16. PAYROLL

Create a payroll module supporting:

* employees
* departments
* salary structure
* attendance
* leave
* bonuses
* incentives
* deductions
* reimbursements
* payroll processing
* payslips
* payroll journal
* PF
* ESI
* Professional Tax
* TDS
* full & final settlement

Do not hard-code jurisdiction-specific rules without versioning.

Tax/compliance rules should be configurable and versioned by effective date.

---

# 17. TDS / TCS

Build a tax deduction module.

Support:

* applicable sections/rules
* vendor/employee classification
* deduction calculation
* threshold tracking
* payment records
* certificates/data preparation
* reconciliation
* reports
* due-date tracking

Tax rules should be data-driven and versioned.

---

# 18. INCOME TAX

Create a dedicated income-tax engine.

Business mode:

* business income
* allowable expenses
* depreciation
* tax estimates
* advance tax
* TDS/TCS
* tax provisions
* financial-year reports

Salaried mode:

* salary
* Form 16 data
* other income
* interest
* capital gains
* deductions
* tax regime comparison
* tax estimate
* tax planning

The system should clearly distinguish:

```text
Calculated
Estimated
User-entered
AI-suggested
Professionally reviewed
Filed
```

Never present an AI estimate as an official tax filing result.

---

# 19. SALARIED / PERSONAL FINANCE MODE

Add a separate personal-finance experience.

Features:

* salary
* bank accounts
* expenses
* investments
* loans
* insurance
* tax
* documents
* net worth
* cash flow
* financial goals
* tax planning
* investment tracking

Business and personal financial data must have clear separation and authorization boundaries.

---

# 20. DOCUMENT INTELLIGENCE

Build:

```text
Upload
↓
File validation
↓
OCR / extraction
↓
AI interpretation
↓
Schema validation
↓
Business validation
↓
User review
↓
Approval
↓
Financial record
```

Documents may include:

* invoices
* receipts
* purchase bills
* bank statements
* GST documents
* Form 16
* salary slips
* contracts
* expense receipts

Maintain document provenance.

Store:

* source document
* extracted fields
* confidence
* extraction timestamp
* model/provider
* reviewer
* approval status

---

# 21. CA COPILOT

This is the central AI feature.

The Copilot should NOT be a generic chatbot.

It should be a tool-using financial intelligence system.

Architecture:

```text
User Question
↓
Intent Detection
↓
Authorization
↓
Retrieve Business Data
↓
Deterministic Calculations
↓
Financial Analysis
↓
AI Explanation
↓
Citations / Data Sources
↓
Recommended Action
```

Example questions:

* "Why did profit fall this month?"
* "Who owes me money?"
* "Which customers are overdue?"
* "Which expenses increased?"
* "What is my GST liability?"
* "How much cash do I have?"
* "Which products are slow-moving?"
* "What invoices are overdue?"
* "What happens if sales fall 20%?"
* "Can I afford this purchase?"
* "Which expenses look unusual?"
* "Show my biggest financial risks."
* "Prepare a monthly business summary."

AI must use actual application data.

Do not hallucinate financial figures.

Every numerical answer should have an inspectable source/calculation path.

---

# 22. AI SAFETY MODEL

Use the following separation:

```text
AI
=
Interpretation
+
Explanation
+
Classification
+
Recommendation
```

Deterministic application services:

```text
=
Calculation
+
Accounting
+
Tax computation
+
Validation
+
Authorization
+
Posting
```

The AI should never directly bypass:

* authorization
* validation
* accounting rules
* tax rules
* approval workflows

---

# 23. BUSINESS INTELLIGENCE

Create an executive dashboard.

Metrics:

* revenue
* gross profit
* net profit
* gross margin
* cash
* receivables
* payables
* inventory
* GST liability
* tax liability
* expenses
* sales growth
* customer growth
* inventory turnover
* overdue invoices

Add:

* month comparison
* year comparison
* trends
* charts
* anomaly detection
* financial health score

---

# 24. CASH-FLOW FORECASTING

Build deterministic forecasting services.

Inputs:

* historical revenue
* expenses
* receivables
* payables
* recurring expenses
* loan payments
* inventory purchases

Outputs:

* projected cash
* expected inflows
* expected outflows
* cash shortage risk
* scenario analysis

Support:

```text
Base Case
Best Case
Worst Case
Custom Scenario
```

---

# 25. COMPLIANCE CALENDAR

Build a compliance engine.

Track:

* GST
* TDS
* TCS
* payroll
* PF
* ESI
* professional tax
* advance tax
* income tax
* other applicable obligations

Each compliance item should have:

* jurisdiction
* applicable entity type
* period
* due date
* status
* responsible person
* reminders
* completion evidence
* notes

Rules must be versioned by effective date.

---

# 26. NOTIFICATIONS

Build a notification system.

Channels should be abstracted:

```text
In-App
Email
SMS
WhatsApp
Push
```

Do not hard-code a single provider.

Notifications:

* invoice overdue
* payment received
* low stock
* expiring stock
* GST deadline
* tax deadline
* reconciliation mismatch
* unusual expense
* cash-flow warning
* compliance deadline

---

# 27. REPORTING

Build professional financial reports.

Required:

* Profit & Loss
* Balance Sheet
* Trial Balance
* General Ledger
* Cash Flow
* Sales
* Purchases
* Expenses
* Receivables aging
* Payables aging
* Inventory valuation
* Stock movement
* GST summary
* Tax summary
* Customer statement
* Supplier statement
* Bank reconciliation
* Payroll reports

Support:

* filtering
* date ranges
* business selection
* export
* PDF
* CSV
* Excel where appropriate
* print

---

# 28. AUDIT SYSTEM

Every important financial mutation should record:

* actor
* business
* action
* entity
* entity ID
* timestamp
* previous value where appropriate
* new value where appropriate
* reason
* request/context ID

Examples:

```text
Invoice created
Invoice edited
Invoice cancelled
Payment recorded
Journal posted
Journal reversed
Tax calculation changed
Bank transaction reconciled
User permission changed
Business membership changed
```

Audit logs must not be editable by normal users.

---

# 29. APPROVAL WORKFLOW

For sensitive actions support:

```text
Draft
↓
Submitted
↓
Under Review
↓
Approved / Rejected
↓
Posted
```

Use approval workflows for configurable high-risk operations such as:

* large payments
* journal adjustments
* invoice cancellation
* tax adjustments
* bank reconciliation
* payroll finalization

---

# 30. SECURITY

Implement strong security practices:

* secure sessions
* RBAC
* permission checks
* tenant isolation
* input validation
* output encoding
* CSRF protection where applicable
* rate limiting
* secure file uploads
* MIME validation
* file-size limits
* malware scanning integration point
* audit logging
* secret management
* safe error messages
* secure headers
* database least privilege where practical

Never log:

* passwords
* access tokens
* refresh tokens
* API keys
* secrets
* sensitive personal information unnecessarily

---

# 31. DATA INTEGRITY

Implement database constraints where possible.

Examples:

* unique invoice numbers per business
* unique GSTIN where appropriate
* valid relationships
* valid statuses
* non-negative quantities where required
* money precision
* valid accounting entries
* active business membership
* tenant ownership

Financial records should use appropriate lifecycle states rather than destructive deletion.

---

# 32. TESTING STRATEGY

Expand tests systematically.

Unit tests:

* tax calculations
* GST
* invoice calculations
* payment calculations
* inventory valuation
* accounting
* depreciation
* payroll
* TDS
* forecasting

Integration tests:

* invoice → payment → ledger
* purchase → inventory → accounting
* POS → inventory → accounting
* bank import → reconciliation
* GST calculation → reporting
* user → business membership → authorization

Security tests:

* cross-tenant access
* inactive memberships
* role escalation
* permission bypass
* forged business IDs
* unauthorized financial mutations

Invariant tests:

```text
Debits = Credits
```

and other domain invariants.

Do not reduce existing test coverage.

---

# 33. UX REQUIREMENTS

The application must feel like a professional SaaS product.

Requirements:

* responsive desktop/mobile UI
* clear navigation
* fast search
* keyboard-friendly workflows
* accessible forms
* consistent components
* proper loading states
* proper empty states
* proper error states
* confirmation for destructive actions
* useful validation messages
* no dead buttons
* no fake functionality
* no unexplained technical errors

For financial pages, prioritize clarity over decorative UI.

---

# 34. GLOBAL SEARCH

Implement application-wide search.

Search:

* customers
* suppliers
* products
* invoices
* payments
* transactions
* documents
* employees
* reports

Later allow natural-language search through CA Copilot.

---

# 35. IMPORT / EXPORT

Support controlled imports:

* customers CSV
* products CSV
* suppliers CSV
* opening balances
* bank statements
* transactions

Always:

```text
Upload
↓
Validate
↓
Preview
↓
Detect errors
↓
User confirmation
↓
Import
```

Never directly import unvalidated financial data.

---

# 36. BUSINESS ONBOARDING

Create a professional onboarding wizard.

Collect:

* business name
* legal name
* business type
* PAN
* GSTIN
* address
* state
* financial year
* accounting method/configuration
* opening balances
* bank accounts
* business categories

Then automatically configure:

* chart of accounts
* tax settings
* compliance calendar
* invoice numbering
* default preferences

---

# 37. MULTI-BUSINESS SUPPORT

A user can own/manage multiple businesses.

Provide:

```text
Business A
Business B
Business C
```

with a secure business switcher.

Never allow a client to switch to an unauthorized business by modifying a URL or request parameter.

---

# 38. PRODUCTION QUALITY

Before declaring a phase complete:

Run:

```bash
npm install
npx prisma generate
npx tsc --noEmit
npm test
npm run build
```

if those scripts exist and are appropriate.

Check:

* database migrations
* seed behavior
* environment variables
* production configuration
* error handling
* logs
* performance
* security
* tenant isolation

---

# 39. DEVELOPMENT STRATEGY

DO NOT implement everything in one giant change.

Work in controlled phases.

## PHASE 0 — AUDIT

Complete repository audit.

Produce:

* architecture map
* feature map
* database assessment
* security assessment
* testing assessment
* technical debt list
* prioritized roadmap

Do not break existing functionality.

---

## PHASE 1 — FOUNDATION HARDENING

Complete:

* authentication
* Supabase/Prisma synchronization
* tenant isolation
* RBAC
* permissions
* audit logging
* error handling
* database integrity
* security baseline

Current working behavior must remain intact.

---

## PHASE 2 — INVENTORY

Complete:

* products
* warehouses
* stock
* batches
* serial numbers
* valuation
* stock movements
* stock alerts
* inventory reports

---

## PHASE 3 — SALES + CUSTOMERS + PAYMENTS

Complete:

```text
Customer
→ Invoice
→ Payment
→ Receipt
→ Customer Ledger
→ Accounting
→ Dashboard
```

Ensure the entire flow is connected.

---

## PHASE 4 — PURCHASES + SUPPLIERS + EXPENSES

Complete:

```text
Supplier
→ Purchase
→ Inventory
→ GST Input
→ Payable
→ Payment
→ Accounting
```

---

## PHASE 5 — POS

Complete:

* barcode
* cart
* checkout
* cash/card/UPI
* split payment
* returns
* receipts
* inventory
* accounting

---

## PHASE 6 — BANKING

Complete:

* bank accounts
* statement import
* categorization
* matching
* reconciliation
* accounting integration

---

## PHASE 7 — GST

Complete:

* tax engine
* GST configuration
* ITC
* output tax
* reconciliation
* GSTR preparation reports
* tax dashboard

---

## PHASE 8 — PAYROLL + TDS

Complete:

* employees
* payroll
* payslips
* PF
* ESI
* PT
* TDS
* payroll accounting

---

## PHASE 9 — TAX + PERSONAL FINANCE

Complete:

* business tax
* salaried mode
* Form 16
* income sources
* deductions
* tax comparison
* tax estimation
* personal net worth

---

## PHASE 10 — DOCUMENT AI

Complete:

* upload
* OCR/extraction
* classification
* structured extraction
* validation
* approval
* document storage
* provenance

---

## PHASE 11 — CA COPILOT

Complete:

* financial Q&A
* business analysis
* document assistance
* anomaly explanations
* tax explanations
* accounting explanations
* recommendations
* source-linked answers
* safe action suggestions

---

## PHASE 12 — BI + FORECASTING

Complete:

* executive dashboard
* financial health
* forecasting
* scenarios
* anomaly detection
* business insights

---

## PHASE 13 — COMPLIANCE

Complete:

* compliance calendar
* reminders
* due dates
* task assignments
* completion tracking
* evidence

---

## PHASE 14 — PRODUCTION HARDENING

Complete:

* security audit
* performance
* database optimization
* indexes
* caching
* rate limits
* logging
* monitoring
* backups
* disaster recovery
* accessibility
* mobile UX
* final automated testing

---

# 40. HOW YOU MUST WORK

At the beginning of each phase:

1. Inspect current implementation.
2. Identify dependencies.
3. Create an implementation plan.
4. Implement backend/domain logic first.
5. Implement database changes.
6. Implement validation.
7. Implement authorization.
8. Implement UI.
9. Connect the workflow.
10. Add tests.
11. Run type checking.
12. Run tests.
13. Run build if appropriate.
14. Inspect git diff.
15. Remove temporary files.
16. Do not commit secrets.
17. Report exactly what changed.

Do not jump ahead to another phase until the current phase is stable.

---

# 41. IMPORTANT RULE FOR AI DEVELOPMENT

If a feature can be implemented deterministically, implement it deterministically.

Examples:

GST:

```text
tax engine
```

not:

```text
LLM guesses GST
```

Accounting:

```text
accounting service
```

not:

```text
LLM creates journal entries blindly
```

Invoice totals:

```text
deterministic calculation
```

not:

```text
LLM calculates total
```

AI should sit above the trusted financial engine.

---

# 42. PRODUCT PRINCIPLE

The product should eventually feel like:

```text
BUSINESS OS
+
ACCOUNTING
+
INVENTORY
+
GST
+
TAX
+
BANKING
+
PAYROLL
+
CFO ANALYTICS
+
AI CA COPILOT
```

A business owner should be able to run most routine financial operations from one system.

A CA/accountant should be able to review, correct, approve, reconcile, and export the work.

A salaried person should be able to manage personal income, expenses, investments, documents, and taxes.

---

# 43. FINAL QUALITY STANDARD

Do not optimize for:

> "feature exists"

Optimize for:

> "feature is trustworthy, connected, secure, testable, auditable, and usable."

For every completed feature ask:

### Data

Is the data model correct?

### Security

Can another tenant access it?

### Accounting

Does it create the correct accounting impact?

### Tax

Is the tax treatment deterministic and configurable?

### UX

Can a normal business owner understand it?

### AI

Can AI explain it without hallucinating?

### Audit

Can we determine who changed it and when?

### Testing

Do tests prove the critical behavior?

### Production

Would this survive real business usage?

---

# 44. START NOW

Your FIRST action is NOT to start coding random features.

Perform the complete repository audit.

Then identify:

1. What is already production-quality.
2. What is partially implemented.
3. What is broken.
4. What is duplicated.
5. What is insecure.
6. What is missing.
7. What should be refactored.
8. What should be implemented next.

Then begin with the highest-priority incomplete workflow.

Do not destroy working code.

Do not create unnecessary files.

Do not create temporary test scripts and leave them in the repository.

Do not add fake/demo functionality to production workflows.

Do not mark a feature complete until it is actually wired end-to-end.

The ultimate objective is to turn this existing repository into a **secure, scalable, multi-tenant, industry-grade Virtual CA + Financial Management + Business Operating System**.
