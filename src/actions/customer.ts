'use server';

import { requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { recordLedgerEntry } from '@/lib/customers/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email').nullish().or(z.literal('')),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  postalCode: z.string().nullish(),
  country: z.string().default('India'),
  taxId: z.string().nullish(),
  notes: z.string().nullish(),
  creditLimit: z.coerce.number().min(0).nullish(),
  openingBalance: z.coerce.number().default(0),
});

export type CustomerFormData = z.input<typeof customerSchema>;

/**
 * Creates a new customer for the active business.
 */
export async function createCustomer(businessId: string, formData: CustomerFormData) {
  const context = await requirePermission(businessId, 'CUSTOMER_CREATE');
  const parsed = customerSchema.parse(formData);

  const customer = await prisma.$transaction(async (tx) => {
    const openingBal = new Prisma.Decimal(parsed.openingBalance || 0);

    const newCustomer = await tx.customer.create({
      data: {
        businessId,
        name: parsed.name,
        email: parsed.email && parsed.email.trim() !== '' ? parsed.email.trim() : null,
        phone: parsed.phone && parsed.phone.trim() !== '' ? parsed.phone.trim() : null,
        address: parsed.address || null,
        city: parsed.city || null,
        state: parsed.state || null,
        postalCode: parsed.postalCode || null,
        country: parsed.country || 'India',
        taxId: parsed.taxId || null,
        notes: parsed.notes || null,
        creditLimit: parsed.creditLimit ? new Prisma.Decimal(parsed.creditLimit) : null,
        openingBalance: openingBal,
        currentBalance: openingBal,
      },
    });

    if (openingBal.greaterThan(0)) {
      await recordLedgerEntry(tx, {
        businessId,
        customerId: newCustomer.id,
        entryType: 'OPENING_BALANCE',
        amount: openingBal,
        description: 'Customer opening receivable balance',
        userId: context.userId,
      });
    }

    return newCustomer;
  });

  await logAuditEvent({
    action: 'CUSTOMER_CREATE',
    businessId,
    userId: context.userId,
    details: {
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone,
    },
  });

  revalidatePath('/customers');
  revalidatePath('/pos');
  revalidatePath('/dashboard');

  return customer;
}

const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email').nullish().or(z.literal('')),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  postalCode: z.string().nullish(),
  country: z.string().default('India'),
  taxId: z.string().nullish(),
  notes: z.string().nullish(),
  creditLimit: z.coerce.number().min(0).nullish(),
});

export type UpdateCustomerFormData = z.input<typeof updateCustomerSchema>;

/**
 * Updates an existing customer profile.
 */
export async function updateCustomer(businessId: string, customerId: string, formData: UpdateCustomerFormData) {
  const context = await requirePermission(businessId, 'CUSTOMER_UPDATE');
  const parsed = updateCustomerSchema.parse(formData);

  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!existing || existing.businessId !== businessId) {
    throw new AppError('Customer not found in this business', 'NOT_FOUND');
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: parsed.name,
      email: parsed.email && parsed.email.trim() !== '' ? parsed.email.trim() : null,
      phone: parsed.phone && parsed.phone.trim() !== '' ? parsed.phone.trim() : null,
      address: parsed.address || null,
      city: parsed.city || null,
      state: parsed.state || null,
      postalCode: parsed.postalCode || null,
      country: parsed.country || 'India',
      taxId: parsed.taxId || null,
      notes: parsed.notes || null,
      creditLimit: parsed.creditLimit ? new Prisma.Decimal(parsed.creditLimit) : null,
    },
  });

  await logAuditEvent({
    action: 'CUSTOMER_UPDATE',
    businessId,
    userId: context.userId,
    details: {
      customerId: updated.id,
      name: updated.name,
    },
  });

  revalidatePath('/customers');
  revalidatePath(`/customers/${customerId}`);

  return updated;
}

/**
 * Soft-archives a customer to preserve historical transaction history.
 */
export async function archiveCustomer(businessId: string, customerId: string) {
  const context = await requirePermission(businessId, 'CUSTOMER_ARCHIVE');

  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!existing || existing.businessId !== businessId) {
    throw new AppError('Customer not found in this business', 'NOT_FOUND');
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { archived: true },
  });

  await logAuditEvent({
    action: 'CUSTOMER_ARCHIVE',
    businessId,
    userId: context.userId,
    details: { customerId, name: updated.name },
  });

  revalidatePath('/customers');
  revalidatePath(`/customers/${customerId}`);

  return updated;
}

/**
 * Unarchives a previously archived customer.
 */
export async function unarchiveCustomer(businessId: string, customerId: string) {
  const context = await requirePermission(businessId, 'CUSTOMER_ARCHIVE');

  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!existing || existing.businessId !== businessId) {
    throw new AppError('Customer not found in this business', 'NOT_FOUND');
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { archived: false },
  });

  await logAuditEvent({
    action: 'CUSTOMER_UNARCHIVE',
    businessId,
    userId: context.userId,
    details: { customerId, name: updated.name },
  });

  revalidatePath('/customers');
  revalidatePath(`/customers/${customerId}`);

  return updated;
}
