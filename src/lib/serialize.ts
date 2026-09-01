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
  Prisma,
} from '@prisma/client';

export function serializeDecimal(value: null | undefined): null;
export function serializeDecimal(value: Prisma.Decimal | number | string): string;
export function serializeDecimal(value: any): string | null;
export function serializeDecimal(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && 'toJSON' in value && typeof (value as any).toJSON === 'function') {
    return (value as any).toJSON();
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
    costPrice: serializeDecimal(product.costPrice as any),
    sellingPrice: serializeDecimal(product.sellingPrice as any),
    stockQuantity: serializeDecimal(product.stockQuantity as any),
    lowStockThreshold: serializeDecimal(product.lowStockThreshold as any),
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
    quantity: serializeDecimal(movement.quantity as any),
    unitCost: serializeDecimal(movement.unitCost as any),
    previousStock: serializeDecimal(movement.previousStock as any),
    resultingStock: serializeDecimal(movement.resultingStock as any),
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
    subtotal: serializeDecimal(invoice.subtotal as any),
    discountAmount: serializeDecimal(invoice.discountAmount as any),
    taxAmount: serializeDecimal(invoice.taxAmount as any),
    totalAmount: serializeDecimal(invoice.totalAmount as any),
    paidAmount: serializeDecimal(invoice.paidAmount as any),
    balanceDue: serializeDecimal(invoice.balanceDue as any),
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
    quantity: serializeDecimal(item.quantity as any),
    unitPrice: serializeDecimal(item.unitPrice as any),
    unitCostSnapshot: serializeDecimal(item.unitCostSnapshot as any),
    discount: serializeDecimal(item.discount as any),
    taxRate: serializeDecimal(item.taxRate as any),
    taxAmount: serializeDecimal(item.taxAmount as any),
    lineSubtotal: serializeDecimal(item.lineSubtotal as any),
    lineTotal: serializeDecimal(item.lineTotal as any),
  };
}

export function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    businessId: payment.businessId,
    invoiceId: payment.invoiceId,
    customerId: payment.customerId,
    amount: serializeDecimal(payment.amount as any),
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    notes: payment.notes,
    idempotencyKey: payment.idempotencyKey,
    receivedAt: serializeDate(payment.receivedAt),
    createdById: payment.createdById,
    createdAt: serializeDate(payment.createdAt),
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
    creditLimit: serializeDecimal(customer.creditLimit as any),
    openingBalance: serializeDecimal(customer.openingBalance as any),
    currentBalance: serializeDecimal(customer.currentBalance as any),
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
    amount: serializeDecimal(entry.amount as any),
    balanceAfter: serializeDecimal(entry.balanceAfter as any),
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

export function serializeInventoryBatch(batch: InventoryBatch) {
  return {
    id: batch.id,
    businessId: batch.businessId,
    productId: batch.productId,
    batchNumber: batch.batchNumber,
    quantity: serializeDecimal(batch.quantity as any),
    remainingQuantity: serializeDecimal(batch.remainingQuantity as any),
    unitCost: serializeDecimal(batch.unitCost as any),
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

export interface AuditLogSummary {
  id: string;
  businessId: string | null;
  userId: string | null;
  action: string;
  details: any;
  ipAddress: string | null;
  createdAt: string | null;
  user?: { id: string; email: string; name: string | null } | null;
}

export function serializeAuditLog(log: any): AuditLogSummary {
  return {
    id: log.id,
    businessId: log.businessId,
    userId: log.userId,
    action: log.action,
    details: log.details ?? null,
    ipAddress: log.ipAddress,
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

export function serializeMember(member: any): MemberSummary {
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

export function serializeInvitation(inv: any): InvitationSummary {
  return {
    id: inv.id,
    businessId: inv.businessId,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    invitedById: inv.invitedById,
    invitedUserId: inv.invitedUserId,
    expiresAt: serializeDate(inv.expiresAt),
    createdAt: serializeDate(inv.createdAt),
    updatedAt: serializeDate(inv.updatedAt),
  };
}
