import { prisma } from '../../lib/prisma';
import { Prisma, AccountType } from '@prisma/client';
import { AppError } from '@/lib/errors';

export interface StandardAccountTemplate {
  code: string;
  name: string;
  type: AccountType;
  category: string;
  description?: string;
}

export const STANDARD_CHART_OF_ACCOUNTS: StandardAccountTemplate[] = [
  // ASSETS (1000 - 1999)
  { code: '1010', name: 'Cash on Hand', type: 'ASSET', category: 'CURRENT_ASSET', description: 'Physical cash held for business operations' },
  { code: '1020', name: 'Bank Current Account', type: 'ASSET', category: 'BANK', description: 'Primary commercial bank operating account' },
  { code: '1100', name: 'Accounts Receivable (Debtors)', type: 'ASSET', category: 'CURRENT_ASSET', description: 'Amounts due from customers for sales on credit' },
  { code: '1200', name: 'Inventory Asset', type: 'ASSET', category: 'INVENTORY', description: 'Cost value of finished goods held for sale' },
  { code: '1300', name: 'GST Input Tax Credit (ITC)', type: 'ASSET', category: 'TAX_ASSET', description: 'Input GST paid on purchases available for set-off' },
  { code: '1500', name: 'Property, Plant & Equipment', type: 'ASSET', category: 'FIXED_ASSET', description: 'Fixed assets used in business operations' },

  // LIABILITIES (2000 - 2999)
  { code: '2010', name: 'Accounts Payable (Creditors)', type: 'LIABILITY', category: 'CURRENT_LIABILITY', description: 'Amounts owed to suppliers for purchases on credit' },
  { code: '2020', name: 'GST Output Tax Payable', type: 'LIABILITY', category: 'TAX_LIABILITY', description: 'GST collected on sales payable to government' },
  { code: '2030', name: 'TDS / TCS Payable', type: 'LIABILITY', category: 'TAX_LIABILITY', description: 'Tax deducted at source payable to government' },
  { code: '2100', name: 'Short-term Borrowings', type: 'LIABILITY', category: 'CURRENT_LIABILITY', description: 'Working capital loans and overdrafts' },

  // EQUITY (3000 - 3999)
  { code: '3010', name: "Owner's Equity Capital", type: 'EQUITY', category: 'EQUITY', description: 'Capital contributed by business owners/partners' },
  { code: '3020', name: 'Retained Earnings', type: 'EQUITY', category: 'EQUITY', description: 'Cumulative profits retained in the business' },

  // REVENUE (4000 - 4999)
  { code: '4010', name: 'Sales Revenue', type: 'REVENUE', category: 'OPERATING_REVENUE', description: 'Gross revenue from sale of goods and merchandise' },
  { code: '4020', name: 'Service Revenue', type: 'REVENUE', category: 'OPERATING_REVENUE', description: 'Gross revenue from professional and consulting services' },
  { code: '4090', name: 'Sales Discounts & Allowances', type: 'REVENUE', category: 'OPERATING_REVENUE', description: 'Discounts granted to customers (contra-revenue)' },
  { code: '4100', name: 'Other Income', type: 'REVENUE', category: 'NON_OPERATING_REVENUE', description: 'Interest, scrap sales, and miscellaneous income' },

  // EXPENSES (5000 - 5999)
  { code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', category: 'DIRECT_EXPENSE', description: 'Direct material and inventory cost of goods sold' },
  { code: '5020', name: 'Office Rent & Utilities', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', description: 'Premises rent, electricity, internet, and utilities' },
  { code: '5030', name: 'Salaries & Wages', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', description: 'Employee compensation and payroll expenses' },
  { code: '5040', name: 'Bank Charges & Payment Gateway Fees', type: 'EXPENSE', category: 'FINANCIAL_EXPENSE', description: 'Transaction processing and banking charges' },
  { code: '5050', name: 'Freight & Delivery Expense', type: 'EXPENSE', category: 'DIRECT_EXPENSE', description: 'Inward and outward transportation costs' },
  { code: '5090', name: 'Depreciation Expense', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', description: 'Periodic depreciation on fixed assets' },
];

/**
 * Initializes the standard Chart of Accounts for a new business.
 * Safe and idempotent (uses upserts).
 */
export async function initializeChartOfAccounts(
  businessId: string,
  txClient?: Prisma.TransactionClient,
  currency = 'INR'
) {
  const client = txClient || prisma;

  const accounts: Record<string, string> = {};

  for (const template of STANDARD_CHART_OF_ACCOUNTS) {
    const record = await client.account.upsert({
      where: {
        businessId_code: {
          businessId,
          code: template.code,
        },
      },
      update: {
        name: template.name,
        type: template.type,
        category: template.category,
        description: template.description,
      },
      create: {
        businessId,
        code: template.code,
        name: template.name,
        type: template.type,
        category: template.category,
        currency,
        balance: new Prisma.Decimal(0),
        description: template.description,
      },
    });

    accounts[template.code] = record.id;
  }

  return accounts;
}

/**
 * Finds or retrieves standard account IDs for a business by their standard codes.
 */
export async function getStandardAccountMap(businessId: string, txClient?: Prisma.TransactionClient) {
  const client = txClient || prisma;

  let accounts = await client.account.findMany({
    where: { businessId },
  });

  if (accounts.length === 0) {
    // Auto-provision if missing
    await initializeChartOfAccounts(businessId, client);
    accounts = await client.account.findMany({
      where: { businessId },
    });
  }

  const map = new Map<string, { id: string; code: string; name: string; type: AccountType; balance: Prisma.Decimal }>();
  for (const acc of accounts) {
    map.set(acc.code, acc);
  }

  return map;
}
