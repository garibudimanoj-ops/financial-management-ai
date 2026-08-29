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
} from '@prisma/client';

export function serializeDecimal(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && 'toJSON' in value && typeof (value as any).toJSON === 'function') {
    return (value as any).toJSON();
  }
  return String(value);
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
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function serializeInventoryMovement(movement: InventoryMovement & {
  product?: { id: string; name: string; SKU: string; unit: string } | null;
  createdBy?: { id: string; email: string; name: string | null } | null;
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
    createdAt: movement.createdAt.toISOString(),
    product: movement.product,
    createdBy: movement.createdBy,
  };
}

export function serializeInvoice(invoice: Invoice & {
  items?: InvoiceItem[];
  customer?: { id: string; name: string; email: string | null } | null;
  payments?: Payment[];
  createdBy?: { id: string; email: string; name: string | null } | null;
}) {
  return {
    id: invoice.id,
    businessId: invoice.businessId,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() || null,
    subtotal: serializeDecimal(invoice.subtotal as any),
    discountAmount: serializeDecimal(invoice.discountAmount as any),
    taxAmount: serializeDecimal(invoice.taxAmount as any),
    totalAmount: serializeDecimal(invoice.totalAmount as any),
    paidAmount: serializeDecimal(invoice.paidAmount as any),
    balanceDue: serializeDecimal(invoice.balanceDue as any),
    notes: invoice.notes,
    idempotencyKey: invoice.idempotencyKey,
    createdById: invoice.createdById,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    items: (invoice.items || []).map(serializeInvoiceItem),
    customer: invoice.customer || null,
    payments: (invoice.payments || []).map(serializePayment),
    createdBy: invoice.createdBy || null,
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
    receivedAt: payment.receivedAt.toISOString(),
    createdById: payment.createdById,
    createdAt: payment.createdAt.toISOString(),
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
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export function serializeCustomerLedgerEntry(entry: CustomerLedgerEntry & {
  createdBy?: { id: string; email: string; name: string | null } | null;
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
    createdAt: entry.createdAt.toISOString(),
    createdBy: entry.createdBy,
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
    receivedDate: batch.receivedDate.toISOString(),
    expiryDate: batch.expiryDate?.toISOString() || null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
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
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}
