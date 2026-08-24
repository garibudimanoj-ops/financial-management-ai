import { describe, it, expect } from 'vitest';
import { hasPermission, Permission } from './permissions';

describe('Permissions System', () => {
  it('should grant OWNER all permissions', () => {
    const ownerPermissions: Permission[] = [
      'BUSINESS_READ',
      'BUSINESS_UPDATE',
      'MEMBERS_READ',
      'MEMBERS_MANAGE',
      'PRODUCT_READ',
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'PRODUCT_ARCHIVE',
      'INVENTORY_READ',
      'INVENTORY_ADJUST',
      'PROFIT_READ',
      'TAX_READ',
      'REPORT_READ',
      'REPORT_EXPORT',
      'AI_FINANCIAL_READ',
      'AUDIT_READ',
    ];

    ownerPermissions.forEach((permission) => {
      expect(hasPermission('OWNER', permission)).toBe(true);
    });
  });

  it('should restrict STAFF from financial and administrative permissions', () => {
    const restrictedPermissions: Permission[] = [
      'BUSINESS_UPDATE',
      'MEMBERS_MANAGE',
      'PRODUCT_ARCHIVE',
      'INVENTORY_ADJUST',
      'SALE_CANCEL',
      'INVOICE_ISSUE',
      'INVOICE_REFUND',
      'EXPENSE_UPDATE',
      'PROFIT_READ',
      'TAX_READ',
      'REPORT_EXPORT',
      'AI_FINANCIAL_READ',
      'AUDIT_READ',
    ];

    restrictedPermissions.forEach((permission) => {
      expect(hasPermission('STAFF', permission)).toBe(false);
    });
  });

  it('should grant STAFF default operational permissions', () => {
    const staffPermissions: Permission[] = [
      'BUSINESS_READ',
      'MEMBERS_READ',
      'PRODUCT_READ',
      'PRODUCT_CREATE',
      'PRODUCT_UPDATE',
      'INVENTORY_READ',
      'CUSTOMER_READ',
      'CUSTOMER_CREATE',
      'CUSTOMER_UPDATE',
      'SALE_CREATE',
      'INVOICE_READ',
      'INVOICE_CREATE',
      'INVOICE_PAY',
      'EXPENSE_READ',
      'EXPENSE_CREATE',
    ];

    staffPermissions.forEach((permission) => {
      expect(hasPermission('STAFF', permission)).toBe(true);
    });
  });
});
