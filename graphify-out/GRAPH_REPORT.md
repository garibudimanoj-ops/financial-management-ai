# Graph Report - financial-management-ai  (2026-09-17)

## Corpus Check
- 412 files · ~230,869 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .example 1, (none) 1, .jsonc 1)

## Summary
- 756 nodes · 2044 edges · 43 communities (34 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37

## God Nodes (most connected - your core abstractions)
1. `AppError` - 84 edges
2. `requireBusinessContext()` - 72 edges
3. `requirePermission()` - 69 edges
4. `prisma` - 57 edges
5. `@prisma/client` - 53 edges
6. `lucide-react` - 46 edges
7. `logAuditEvent()` - 46 edges
8. `hasPermission()` - 42 edges
9. `vitest` - 29 edges
10. `toDecimal()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `listProducts()` --indirect_call--> `serializeProduct()`  [INFERRED]
  src/actions/product.ts → src/lib/serialize.ts
- `CustomerDetailPage()` --indirect_call--> `serializeCustomerLedgerEntry()`  [INFERRED]
  src/app/customers/[id]/page.tsx → src/lib/serialize.ts
- `InvoicesPage()` --indirect_call--> `serializeInvoice()`  [INFERRED]
  src/app/invoices/page.tsx → src/lib/serialize.ts
- `ProductDetailPage()` --indirect_call--> `serializeInventoryMovement()`  [INFERRED]
  src/app/products/[id]/page.tsx → src/lib/serialize.ts
- `PurchasesPage()` --indirect_call--> `serializePurchaseBill()`  [INFERRED]
  src/app/purchases/page.tsx → src/lib/serialize.ts

## Import Cycles
- None detected.

## Communities (43 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (69): lucide-react, ref_next_link, ref_next_navigation, POST(), AuditLogsPage(), CAAssistantPage(), CustomerDetailPage(), CustomerDetailPageProps (+61 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (51): ref_next_server, GET, POST, mocks, ownContext, GET, GET, GET (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (47): ref_next_headers, react, @supabase/ssr, authSchema, login(), logout(), requestPasswordReset(), resetRequestSchema (+39 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (40): cancelInvoiceAction(), issueInvoiceAction(), refundInvoiceAction(), recordPaymentAction(), reversePaymentAction(), InvoiceDetailPage(), InvoiceDetailPageProps, Invoice (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (39): recordLedgerEntry(), DecimalLike, toDecimal(), calculateBalanceDue(), calculateInvoiceTotals(), calculateLineItemTotals(), ComputedInvoiceTotals, ComputedLineItem (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (21): DraftTransactionResponse, POST, checkRateLimit(), RateLimitRecord, rateLimitStore, resetRateLimit(), computeLineItem(), computeTaxBreakdown() (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (24): name, prisma, seed, private, version, class-variance-authority, clsx, dotenv (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (9): vitest, ErrorCode, mocks, payment(), mocks, product(), setupProducts(), mocks (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (14): connectionUrl, adapter, connectionUrl, globalForPrisma, pool, prisma, adapter, connectionUrl (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (16): logAuditEvent(), LogParams, AppError, cancelInvoice(), refundInvoice(), reversePayment(), reverseSourceJournal(), cancelPurchaseBill() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority, clsx, dotenv, @hookform/resolvers, lucide-react, next, pg (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (14): archiveCustomer(), createCustomer(), CustomerFormData, customerSchema, unarchiveCustomer(), updateCustomer(), UpdateCustomerFormData, updateCustomerSchema (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.21
Nodes (13): archiveProduct(), createProduct(), CreateProductFormData, productSchema, unarchiveProduct(), updateProduct(), UpdateProductFormData, updateProductSchema (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (14): getStandardAccountMap(), STANDARD_CHART_OF_ACCOUNTS, StandardAccountTemplate, ExpenseJournalInput, generateNextTransactionNumber(), PaymentJournalInput, PurchaseJournalInput, recordExpenseJournal() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (12): addStockAction(), AddStockFormData, addStockSchema, adjustStockAction(), AdjustStockFormData, adjustStockSchema, ProductOption, StockAdjustmentDialog() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, playwright, prisma, tailwindcss, @tailwindcss/postcss, tsx (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (11): ref_next_cache, zod, createExpenseAction(), ExpenseFormData, expenseSchema, paymentSchema, RecordPaymentFormData, ReversePaymentFormData (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (8): ref_node_fs, playwright, emailInput, events, forgotEmail, passwordInput, safeUrl(), snapshot()

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (12): scripts, build, dev, lint, postinstall, preflight, prisma:generate, prisma:migrate (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (8): @prisma/client, addStock(), AddStockInput, adjustStock(), AdjustStockInput, getInventoryMovements(), calculateInventoryValuation(), calculateWeightedAverageCost()

### Community 21 - "Community 21"
Cohesion: 0.21
Nodes (11): cancelPurchaseBillAction(), cancelPurchaseBillFormAction(), CreatePurchaseBillFormData, createPurchaseBillSchema, purchaseItemSchema, receiveAndPostPurchaseBillAction(), receiveAndPostPurchaseBillFormAction(), recordPaymentSchema (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.26
Nodes (9): archiveSupplierAction(), createSupplierAction(), SupplierFormData, supplierSchema, updateSupplierAction(), SupplierData, SupplierEditForm(), SupplierEditFormProps (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (9): calculateIndianGst(), calculatePurchaseTotals(), PurchaseCalculationItem, PurchaseTotals, createPurchaseBill(), CreatePurchaseBillInput, generateNextBillNumber(), PurchaseBillItemInput (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (8): CartItem, Customer, PaymentMethod, POSTerminal(), POSTerminalProps, Product, TenderMethod, getStockWarning()

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (7): nextConfig, next, ref_next_font_google, src_app_globals, geistMono, geistSans, metadata

### Community 26 - "Community 26"
Cohesion: 0.24
Nodes (6): createExpense(), CreateExpenseInput, generateNextExpenseNumber(), expenseAccount, mocks, tx

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (8): CancelInvoiceFormData, cancelInvoiceSchema, finalizeSaleAction(), FinalizeSaleFormData, finalizeSaleSchema, RefundInvoiceFormData, refundSchema, saleItemSchema

### Community 28 - "Community 28"
Cohesion: 0.32
Nodes (5): CreateLedgerEntryInput, reconcileCustomerBalance(), makeDecimal(), mockCustomer, resetState()

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): createPurchaseBillAction(), ProductOption, PurchaseBillFormModal(), PurchaseBillFormModalProps, PurchaseItem, SupplierOption

### Community 30 - "Community 30"
Cohesion: 0.53
Nodes (5): listProducts(), decimalToString(), escapeCSV(), GET(), requirePermission()

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (3): mocks, product(), setupFinalizeTxn()

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (4): eslintConfig, ref_eslint_config, ref_eslint_config_next_core_web_vitals, ref_eslint_config_next_typescript

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (3): overrides, deepmerge-ts, mysql2

## Knowledge Gaps
- **265 isolated node(s):** `connectionUrl`, `eslintConfig`, `globalForPrisma`, `connectionUrl`, `pool` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 326 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Community 20` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 21`, `Community 23`, `Community 26`, `Community 27`, `Community 28`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Why does `AppError` connect `Community 9` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 12`, `Community 13`, `Community 14`, `Community 20`, `Community 23`, `Community 26`, `Community 27`, `Community 28`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Community 0` to `Community 2`, `Community 3`, `Community 6`, `Community 12`, `Community 13`, `Community 15`, `Community 17`, `Community 22`, `Community 24`, `Community 29`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `connectionUrl`, `eslintConfig`, `globalForPrisma` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06048906048906049 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05438184663536776 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.057692307692307696 - nodes in this community are weakly interconnected._