import {
  Product,
  InventoryMovement,
  Invoice,
  InvoiceItem,
  Payment,
  Customer,
  CustomerLedgerEntry,
  InventoryBatch,
  Business,
  Supplier,
  PurchaseBill,
  PurchaseBillItem,
  PurchasePayment,
  Expense,
  ExpenseCategory,
  Prisma,
} from '@prisma/client';

export function serializeDecimal(value: null | undefined): null;
export function serializeDecimal(value: Prisma.Decimal | number | string): string;
export function serializeDecimal(value: Prisma.Decimal | number | string | null | undefined): string | null;
export function serializeDecimal(value: Prisma.Decimal | number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function') {
    return String(value.toJSON());
  }
  return String(value);
}

export function serializeDate(value: null | undefined): null;
export function serializeDate(value: Date): string;
export function serializeDate(value: Date | string | null | undefined): string | null;
export function serializeDate(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export interface ProductSummary {
  id: string;
  name: string;
  SKU: string;
  unit: string;
}

export function serializeProductSummary(p: ProductSummary | null | undefined): ProductSummary | null {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    SKU: p.SKU,
    unit: p.unit,
  };
}

export interface UserSummary {
  id: string;
  email: string;
  name: string | null;
}

export function serializeUserSummary(u: UserSummary | null | undefined): UserSummary | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
  };
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export function serializeCustomerSummary(c: CustomerSummary | null | undefined): CustomerSummary | null {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
  };
}

export interface SupplierSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export function serializeSupplierSummary(s: SupplierSummary | null | undefined): SupplierSummary | null {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
  };
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
}

export function serializeInvoiceSummary(i: InvoiceSummary | null | undefined): InvoiceSummary | null {
  if (!i) return null;
  return {
    id: i.id,
    invoiceNumber: i.invoiceNumber,
  };
}

export function serializeProduct(product: Product) {
  return {
    id: product.id,
    businessId: product.businessId,
    name: product.name,
    description: product.description,
    SKU: product.SKU,
    barcode: product.barcode,
    category: product.category,
    unit: product.unit,
    costPrice: serializeDecimal(product.costPrice),
    sellingPrice: serializeDecimal(product.sellingPrice),
    stockQuantity: serializeDecimal(product.stockQuantity),
    lowStockThreshold: serializeDecimal(product.lowStockThreshold),
    taxCategory: product.taxCategory,
    archived: product.archived,
    createdById: product.createdById,
    updatedById: product.updatedById,
    createdAt: serializeDate(product.createdAt),
    updatedAt: serializeDate(product.updatedAt),
  };
}

export function serializeInventoryMovement(movement: InventoryMovement & {
  product?: { id: string; name: string; SKU: string; unit: string } | null;
  createdBy?: { id: string; email: string; name: string | null } | null;
  batch?: { id: string; batchNumber: string } | null;
}) {
  return {
    id: movement.id,
    businessId: movement.businessId,
    productId: movement.productId,
    batchId: movement.batchId,
    movementType: movement.movementType,
    quantity: serializeDecimal(movement.quantity),
    unitCost: serializeDecimal(movement.unitCost),
    previousStock: serializeDecimal(movement.previousStock),
    resultingStock: serializeDecimal(movement.resultingStock),
    reason: movement.reason,
    reference: movement.reference,
    createdById: movement.createdById,
    createdAt: serializeDate(movement.createdAt),
    product: serializeProductSummary(movement.product),
    createdBy: serializeUserSummary(movement.createdBy),
  };
}

export function serializeInvoice(invoice: Invoice & {
  items?: InvoiceItem[];
  customer?: { id: string; name: string; email: string | null; phone?: string | null } | null;
  payments?: Payment[];
  createdBy?: { id: string; email: string; name: string | null } | null;
}) {
  return {
    id: invoice.id,
    businessId: invoice.businessId,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: serializeDate(invoice.issueDate),
    dueDate: serializeDate(invoice.dueDate),
    subtotal: serializeDecimal(invoice.subtotal),
    discountAmount: serializeDecimal(invoice.discountAmount),
    taxAmount: serializeDecimal(invoice.taxAmount),
    totalAmount: serializeDecimal(invoice.totalAmount),
    paidAmount: serializeDecimal(invoice.paidAmount),
    balanceDue: serializeDecimal(invoice.balanceDue),
    notes: invoice.notes,
    idempotencyKey: invoice.idempotencyKey,
    createdById: invoice.createdById,
    createdAt: serializeDate(invoice.createdAt),
    updatedAt: serializeDate(invoice.updatedAt),
    items: (invoice.items || []).map(serializeInvoiceItem),
    customer: invoice.customer
      ? {
          id: invoice.customer.id,
          name: invoice.customer.name,
          email: invoice.customer.email,
          phone: invoice.customer.phone ?? null,
        }
      : null,
    payments: (invoice.payments || []).map((p) => ({
      ...serializePayment(p),
      customer: p.customerId
        ? { id: p.customerId, name: '', email: null, phone: null }
        : null,
      invoice: p.invoiceId
        ? { id: p.invoiceId, invoiceNumber: '' }
        : null,
    })),
    createdBy: serializeUserSummary(invoice.createdBy),
  };
}

export function serializeInvoiceItem(item: InvoiceItem) {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    productId: item.productId,
    productNameSnapshot: item.productNameSnapshot,
    skuSnapshot: item.skuSnapshot,
    unitSnapshot: item.unitSnapshot,
    quantity: serializeDecimal(item.quantity),
    unitPrice: serializeDecimal(item.unitPrice),
    unitCostSnapshot: serializeDecimal(item.unitCostSnapshot),
    discount: serializeDecimal(item.discount),
    taxRate: serializeDecimal(item.taxRate),
    taxAmount: serializeDecimal(item.taxAmount),
    lineSubtotal: serializeDecimal(item.lineSubtotal),
    lineTotal: serializeDecimal(item.lineTotal),
  };
}

export function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    businessId: payment.businessId,
    invoiceId: payment.invoiceId,
    customerId: payment.customerId,
    amount: serializeDecimal(payment.amount),
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    notes: payment.notes,
    idempotencyKey: payment.idempotencyKey,
    receivedAt: serializeDate(payment.receivedAt),
    createdById: payment.createdById,
    createdAt: serializeDate(payment.createdAt),
    reversedAt: serializeDate(payment.reversedAt),
    reversalReason: payment.reversalReason,
  };
}

export function serializePaymentWithRelations(payment: Payment & {
  customer?: { id: string; name: string } | null;
  invoice?: { id: string; invoiceNumber: string } | null;
  createdBy?: { id: string; email: string; name: string | null } | null;
}) {
  return {
    ...serializePayment(payment),
    customer: payment.customer
      ? { id: payment.customer.id, name: payment.customer.name }
      : null,
    invoice: payment.invoice
      ? { id: payment.invoice.id, invoiceNumber: payment.invoice.invoiceNumber }
      : null,
    createdBy: serializeUserSummary(payment.createdBy),
  };
}

export function serializeCustomer(customer: Customer) {
  return {
    id: customer.id,
    businessId: customer.businessId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    postalCode: customer.postalCode,
    country: customer.country,
    taxId: customer.taxId,
    notes: customer.notes,
    creditLimit: serializeDecimal(customer.creditLimit),
    openingBalance: serializeDecimal(customer.openingBalance),
    currentBalance: serializeDecimal(customer.currentBalance),
    archived: customer.archived,
    createdAt: serializeDate(customer.createdAt),
    updatedAt: serializeDate(customer.updatedAt),
  };
}

export function serializeCustomerLedgerEntry(entry: CustomerLedgerEntry & {
  createdBy?: { id: string; email: string; name: string | null } | null;
  invoice?: { id: string; invoiceNumber: string } | null;
  payment?: { id: string } | null;
}) {
  return {
    id: entry.id,
    businessId: entry.businessId,
    customerId: entry.customerId,
    invoiceId: entry.invoiceId,
    paymentId: entry.paymentId,
    entryType: entry.entryType,
    amount: serializeDecimal(entry.amount),
    balanceAfter: serializeDecimal(entry.balanceAfter),
    description: entry.description,
    reference: entry.reference,
    createdById: entry.createdById,
    createdAt: serializeDate(entry.createdAt),
    createdBy: serializeUserSummary(entry.createdBy),
    invoice: entry.invoice
      ? { id: entry.invoice.id, invoiceNumber: entry.invoice.invoiceNumber }
      : null,
    payment: entry.payment ? { id: entry.payment.id } : null,
  };
}

export function serializeSupplier(supplier: Supplier) {
  return {
    id: supplier.id,
    businessId: supplier.businessId,
    name: supplier.name,
    contactPerson: supplier.contactPerson,
    email: supplier.email,
    phone: supplier.phone,
    gstin: supplier.gstin,
    pan: supplier.pan,
    address: supplier.address,
    city: supplier.city,
    state: supplier.state,
    pincode: supplier.pincode,
    paymentTerms: supplier.paymentTerms,
    creditLimit: serializeDecimal(supplier.creditLimit),
    currentBalance: serializeDecimal(supplier.currentBalance),
    archived: supplier.archived,
    notes: supplier.notes,
    createdById: supplier.createdById,
    createdAt: serializeDate(supplier.createdAt),
    updatedAt: serializeDate(supplier.updatedAt),
  };
}

export function serializePurchaseBillItem(item: PurchaseBillItem) {
  return {
    id: item.id,
    billId: item.billId,
    productId: item.productId,
    productNameSnapshot: item.productNameSnapshot,
    skuSnapshot: item.skuSnapshot,
    unitSnapshot: item.unitSnapshot,
    quantity: serializeDecimal(item.quantity),
    unitCost: serializeDecimal(item.unitCost),
    discount: serializeDecimal(item.discount),
    taxRate: serializeDecimal(item.taxRate),
    taxAmount: serializeDecimal(item.taxAmount),
    lineSubtotal: serializeDecimal(item.lineSubtotal),
    lineTotal: serializeDecimal(item.lineTotal),
    createdAt: serializeDate(item.createdAt),
  };
}

export function serializePurchaseBill(bill: PurchaseBill & {
  items?: PurchaseBillItem[];
  supplier?: { id: string; name: string; email: string | null; phone: string | null; gstin: string | null } | null;
  payments?: PurchasePayment[];
  createdBy?: { id: string; email: string; name: string | null } | null;
}) {
  return {
    id: bill.id,
    businessId: bill.businessId,
    supplierId: bill.supplierId,
    billNumber: bill.billNumber,
    supplierInvoiceNumber: bill.supplierInvoiceNumber,
    status: bill.status,
    billDate: serializeDate(bill.billDate),
    dueDate: serializeDate(bill.dueDate),
    subtotal: serializeDecimal(bill.subtotal),
    discountAmount: serializeDecimal(bill.discountAmount),
    taxAmount: serializeDecimal(bill.taxAmount),
    cgstAmount: serializeDecimal(bill.cgstAmount),
    sgstAmount: serializeDecimal(bill.sgstAmount),
    igstAmount: serializeDecimal(bill.igstAmount),
    totalAmount: serializeDecimal(bill.totalAmount),
    paidAmount: serializeDecimal(bill.paidAmount),
    balanceDue: serializeDecimal(bill.balanceDue),
    notes: bill.notes,
    idempotencyKey: bill.idempotencyKey,
    createdById: bill.createdById,
    createdAt: serializeDate(bill.createdAt),
    updatedAt: serializeDate(bill.updatedAt),
    items: (bill.items || []).map(serializePurchaseBillItem),
    supplier: bill.supplier
      ? {
          id: bill.supplier.id,
          name: bill.supplier.name,
          email: bill.supplier.email,
          phone: bill.supplier.phone,
          gstin: bill.supplier.gstin,
        }
      : null,
    payments: (bill.payments || []).map(serializePurchasePayment),
    createdBy: serializeUserSummary(bill.createdBy),
  };
}

export function serializePurchasePayment(payment: PurchasePayment & {
  supplier?: { id: string; name: string } | null;
  bill?: { id: string; billNumber: string } | null;
  createdBy?: { id: string; email: string; name: string | null } | null;
}) {
  return {
    id: payment.id,
    businessId: payment.businessId,
    billId: payment.billId,
    supplierId: payment.supplierId,
    amount: serializeDecimal(payment.amount),
    paymentMethod: payment.paymentMethod,
    paymentDate: serializeDate(payment.paymentDate),
    reference: payment.reference,
    notes: payment.notes,
    idempotencyKey: payment.idempotencyKey,
    createdById: payment.createdById,
    createdAt: serializeDate(payment.createdAt),
    updatedAt: serializeDate(payment.updatedAt),
    supplier: payment.supplier ? { id: payment.supplier.id, name: payment.supplier.name } : null,
    bill: payment.bill ? { id: payment.bill.id, billNumber: payment.bill.billNumber } : null,
    createdBy: serializeUserSummary(payment.createdBy),
  };
}

export function serializeExpense(expense: Expense & {
  account?: { id: string; code: string; name: string } | null;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  createdBy?: { id: string; email: string; name: string | null } | null;
}) {
  return {
    id: expense.id,
    businessId: expense.businessId,
    expenseNumber: expense.expenseNumber,
    categoryId: expense.categoryId,
    accountId: expense.accountId,
    supplierId: expense.supplierId,
    payeeName: expense.payeeName,
    amount: serializeDecimal(expense.amount),
    taxRate: serializeDecimal(expense.taxRate),
    taxAmount: serializeDecimal(expense.taxAmount),
    totalAmount: serializeDecimal(expense.totalAmount),
    paymentMethod: expense.paymentMethod,
    paymentStatus: expense.paymentStatus,
    expenseDate: serializeDate(expense.expenseDate),
    reference: expense.reference,
    receiptUrl: expense.receiptUrl,
    notes: expense.notes,
    createdById: expense.createdById,
    createdAt: serializeDate(expense.createdAt),
    updatedAt: serializeDate(expense.updatedAt),
    account: expense.account ? { id: expense.account.id, code: expense.account.code, name: expense.account.name } : null,
    category: expense.category ? { id: expense.category.id, name: expense.category.name } : null,
    supplier: expense.supplier ? { id: expense.supplier.id, name: expense.supplier.name } : null,
    createdBy: serializeUserSummary(expense.createdBy),
  };
}

export function serializeInventoryBatch(batch: InventoryBatch) {
  return {
    id: batch.id,
    businessId: batch.businessId,
    productId: batch.productId,
    batchNumber: batch.batchNumber,
    quantity: serializeDecimal(batch.quantity),
    remainingQuantity: serializeDecimal(batch.remainingQuantity),
    unitCost: serializeDecimal(batch.unitCost),
    receivedDate: serializeDate(batch.receivedDate),
    expiryDate: serializeDate(batch.expiryDate),
    createdAt: serializeDate(batch.createdAt),
    updatedAt: serializeDate(batch.updatedAt),
  };
}

export function serializeBusiness(business: Business) {
  return {
    id: business.id,
    name: business.name,
    accountType: business.accountType,
    businessType: business.businessType,
    country: business.country,
    state: business.state,
    city: business.city,
    baseCurrency: business.baseCurrency,
    fiscalYearStart: business.fiscalYearStart,
    taxRegistrationStatus: business.taxRegistrationStatus,
    taxId: business.taxId,
    createdAt: serializeDate(business.createdAt),
    updatedAt: serializeDate(business.updatedAt),
  };
}

export interface AuditLogDetails {
  [key: string]: unknown;
}

export interface AuditLogSummary {
  id: string;
  businessId: string | null;
  userId: string | null;
  action: string;
  details: AuditLogDetails | null;
  ipAddress: string | null;
  createdAt: string | null;
  user?: { id: string; email: string; name: string | null } | null;
}

export interface AuditLogInput {
  id: string;
  businessId: string | null;
  userId: string | null;
  action: string;
  details?: AuditLogDetails | null;
  ipAddress?: string | null;
  createdAt?: Date | string | null;
  user?: { id: string; email: string; name: string | null } | null;
}

export function serializeAuditLog(log: AuditLogInput): AuditLogSummary {
  return {
    id: log.id,
    businessId: log.businessId,
    userId: log.userId,
    action: log.action,
    details: log.details ?? null,
    ipAddress: log.ipAddress ?? null,
    createdAt: serializeDate(log.createdAt),
    user: log.user
      ? { id: log.user.id, email: log.user.email, name: log.user.name }
      : null,
  };
}

export interface MemberSummary {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  user: { id: string; email: string; name: string | null };
}

export interface MemberInput {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  status: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  user: { id: string; email: string; name: string | null };
}

export function serializeMember(member: MemberInput): MemberSummary {
  return {
    id: member.id,
    businessId: member.businessId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    createdAt: serializeDate(member.createdAt),
    updatedAt: serializeDate(member.updatedAt),
    user: {
      id: member.user.id,
      email: member.user.email,
      name: member.user.name,
    },
  };
}

export interface InvitationInput {
  id: string;
  businessId: string;
  email: string;
  role: string;
  status: string;
  invitedById: string;
  invitedUserId?: string | null;
  expiresAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface InvitationSummary {
  id: string;
  businessId: string;
  email: string;
  role: string;
  status: string;
  invitedById: string;
  invitedUserId: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function serializeInvitation(inv: InvitationInput): InvitationSummary {
  return {
    id: inv.id,
    businessId: inv.businessId,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    invitedById: inv.invitedById,
    invitedUserId: inv.invitedUserId ?? null,
    expiresAt: serializeDate(inv.expiresAt),
    createdAt: serializeDate(inv.createdAt),
    updatedAt: serializeDate(inv.updatedAt),
  };
}
