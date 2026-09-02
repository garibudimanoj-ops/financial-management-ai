import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/errors';
import { logAuditEvent } from '@/lib/audit';

export interface CreateSupplierInput {
  businessId: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  paymentTerms?: string | null;
  creditLimit?: number | string | Prisma.Decimal | null;
  openingBalance?: number | string | Prisma.Decimal | null;
  notes?: string | null;
  userId: string;
}

export interface UpdateSupplierInput {
  businessId: string;
  supplierId: string;
  name?: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  paymentTerms?: string | null;
  creditLimit?: number | string | Prisma.Decimal | null;
  notes?: string | null;
  userId: string;
}

/**
 * Creates a new supplier within tenant isolation.
 */
export async function createSupplier(input: CreateSupplierInput) {
  if (!input.name || input.name.trim() === '') {
    throw new AppError('Supplier name is required', 'VALIDATION_ERROR');
  }

  const openingBal = input.openingBalance ? new Prisma.Decimal(input.openingBalance.toString()) : new Prisma.Decimal(0);
  const creditLim = input.creditLimit ? new Prisma.Decimal(input.creditLimit.toString()) : null;

  const supplier = await prisma.supplier.create({
    data: {
      businessId: input.businessId,
      name: input.name.trim(),
      contactPerson: input.contactPerson?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      gstin: input.gstin?.trim() || null,
      pan: input.pan?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      pincode: input.pincode?.trim() || null,
      paymentTerms: input.paymentTerms?.trim() || 'DUE_ON_RECEIPT',
      creditLimit: creditLim,
      currentBalance: openingBal,
      notes: input.notes?.trim() || null,
      createdById: input.userId,
    },
  });

  await logAuditEvent({
    action: 'SUPPLIER_CREATE',
    businessId: input.businessId,
    userId: input.userId,
    details: { supplierId: supplier.id, supplierName: supplier.name },
  });

  return supplier;
}

/**
 * Updates an existing supplier.
 */
export async function updateSupplier(input: UpdateSupplierInput) {
  const existing = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });

  if (!existing || existing.businessId !== input.businessId) {
    throw new AppError('Supplier not found in this business', 'NOT_FOUND');
  }

  const updated = await prisma.supplier.update({
    where: { id: input.supplierId },
    data: {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      contactPerson: input.contactPerson !== undefined ? (input.contactPerson?.trim() || null) : existing.contactPerson,
      email: input.email !== undefined ? (input.email?.trim() || null) : existing.email,
      phone: input.phone !== undefined ? (input.phone?.trim() || null) : existing.phone,
      gstin: input.gstin !== undefined ? (input.gstin?.trim() || null) : existing.gstin,
      pan: input.pan !== undefined ? (input.pan?.trim() || null) : existing.pan,
      address: input.address !== undefined ? (input.address?.trim() || null) : existing.address,
      city: input.city !== undefined ? (input.city?.trim() || null) : existing.city,
      state: input.state !== undefined ? (input.state?.trim() || null) : existing.state,
      pincode: input.pincode !== undefined ? (input.pincode?.trim() || null) : existing.pincode,
      paymentTerms: input.paymentTerms !== undefined ? (input.paymentTerms?.trim() || null) : existing.paymentTerms,
      creditLimit: input.creditLimit !== undefined ? (input.creditLimit ? new Prisma.Decimal(input.creditLimit.toString()) : null) : existing.creditLimit,
      notes: input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes,
    },
  });

  await logAuditEvent({
    action: 'SUPPLIER_UPDATE',
    businessId: input.businessId,
    userId: input.userId,
    details: { supplierId: updated.id, supplierName: updated.name },
  });

  return updated;
}

/**
 * Archives or restores a supplier (soft delete).
 */
export async function setSupplierArchived(businessId: string, supplierId: string, archived: boolean, userId: string) {
  const existing = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });

  if (!existing || existing.businessId !== businessId) {
    throw new AppError('Supplier not found in this business', 'NOT_FOUND');
  }

  const updated = await prisma.supplier.update({
    where: { id: supplierId },
    data: { archived },
  });

  await logAuditEvent({
    action: archived ? 'SUPPLIER_ARCHIVE' : 'SUPPLIER_RESTORE',
    businessId,
    userId,
    details: { supplierId, supplierName: updated.name },
  });

  return updated;
}

/**
 * Lists suppliers for an active tenant with optional search.
 */
export async function listSuppliers(businessId: string, search?: string, includeArchived = false) {
  const where: Prisma.SupplierWhereInput = {
    businessId,
    ...(includeArchived ? {} : { archived: false }),
    ...(search && search.trim() !== ''
      ? {
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { phone: { contains: search.trim(), mode: 'insensitive' } },
            { gstin: { contains: search.trim(), mode: 'insensitive' } },
            { email: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
  });
}

/**
 * Retrieves a single supplier with recent purchase bills and payments.
 */
export async function getSupplierDetails(businessId: string, supplierId: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      purchaseBills: {
        orderBy: { billDate: 'desc' },
        take: 20,
      },
      purchasePayments: {
        orderBy: { paymentDate: 'desc' },
        take: 20,
      },
    },
  });

  if (!supplier || supplier.businessId !== businessId) {
    throw new AppError('Supplier not found in this business', 'NOT_FOUND');
  }

  return supplier;
}
