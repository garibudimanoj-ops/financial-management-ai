'use server';

import { requirePermission } from '@/lib/auth';
import { createSupplier, updateSupplier, setSupplierArchived } from '@/services/purchases/supplierService';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal('')),
  phone: z.string().nullish(),
  gstin: z.string().nullish(),
  pan: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  pincode: z.string().nullish(),
  paymentTerms: z.string().nullish().default('DUE_ON_RECEIPT'),
  creditLimit: z.coerce.number().min(0).nullish(),
  openingBalance: z.coerce.number().min(0).nullish(),
  notes: z.string().nullish(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export async function createSupplierAction(businessId: string, formData: SupplierFormData) {
  const context = await requirePermission(businessId, 'SUPPLIER_CREATE');
  const parsed = supplierSchema.parse(formData);

  const supplier = await createSupplier({
    businessId,
    name: parsed.name,
    contactPerson: parsed.contactPerson,
    email: parsed.email || null,
    phone: parsed.phone,
    gstin: parsed.gstin,
    pan: parsed.pan,
    address: parsed.address,
    city: parsed.city,
    state: parsed.state,
    pincode: parsed.pincode,
    paymentTerms: parsed.paymentTerms,
    creditLimit: parsed.creditLimit,
    openingBalance: parsed.openingBalance,
    notes: parsed.notes,
    userId: context.userId,
  });

  revalidatePath('/suppliers');
  return supplier;
}

export async function updateSupplierAction(businessId: string, supplierId: string, formData: Partial<SupplierFormData>) {
  const context = await requirePermission(businessId, 'SUPPLIER_UPDATE');

  const supplier = await updateSupplier({
    businessId,
    supplierId,
    name: formData.name,
    contactPerson: formData.contactPerson,
    email: formData.email || null,
    phone: formData.phone,
    gstin: formData.gstin,
    pan: formData.pan,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    pincode: formData.pincode,
    paymentTerms: formData.paymentTerms,
    creditLimit: formData.creditLimit,
    notes: formData.notes,
    userId: context.userId,
  });

  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${supplierId}`);
  return supplier;
}

export async function archiveSupplierAction(businessId: string, supplierId: string, archived: boolean) {
  const context = await requirePermission(businessId, 'SUPPLIER_ARCHIVE');
  const supplier = await setSupplierArchived(businessId, supplierId, archived, context.userId);

  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${supplierId}`);
  return supplier;
}
