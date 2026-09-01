import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/financial_management_ai';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database with CA Co-Pilot demo records...');

  // 1. Upsert Demo Business
  const business = await prisma.business.upsert({
    where: { id: 'biz-apex-demo' },
    update: {},
    create: {
      id: 'biz-apex-demo',
      name: 'Apex Global Enterprises Ltd.',
      accountType: 'COMPANY',
      businessType: 'TRADING_AND_SERVICES',
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      baseCurrency: 'INR',
      fiscalYearStart: '04-01',
      taxRegistrationStatus: true,
      taxId: '27AABCU9603R1ZM',
    },
  });
  console.log(`✅ Business initialized: ${business.name} (${business.id})`);

  // 2. Upsert Demo Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@apexglobal.demo' },
    update: {},
    create: {
      supabaseUserId: 'sub-admin-demo-uuid',
      email: 'admin@apexglobal.demo',
      name: 'Priya Sharma (Principal CA)',
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@apexglobal.demo' },
    update: {},
    create: {
      supabaseUserId: 'sub-staff-demo-uuid',
      email: 'staff@apexglobal.demo',
      name: 'Rahul Verma (Accounts Officer)',
    },
  });

  // 3. Upsert Business Memberships
  await prisma.businessMember.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: adminUser.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.businessMember.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: staffUser.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: staffUser.id,
      role: 'STAFF',
      status: 'ACTIVE',
    },
  });

  // 4. Upsert Standard Chart of Accounts
  const accountsData = [
    { code: '1010', name: 'Cash on Hand', type: 'ASSET' as const, category: 'CURRENT_ASSET', balance: new Prisma.Decimal('50000.00') },
    { code: '1020', name: 'HDFC Bank Current A/C', type: 'ASSET' as const, category: 'BANK', balance: new Prisma.Decimal('500000.00') },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' as const, category: 'CURRENT_ASSET', balance: new Prisma.Decimal('0.00') },
    { code: '1200', name: 'Inventory Asset', type: 'ASSET' as const, category: 'INVENTORY', balance: new Prisma.Decimal('75000.00') },
    { code: '2010', name: 'Accounts Payable', type: 'LIABILITY' as const, category: 'CURRENT_LIABILITY', balance: new Prisma.Decimal('0.00') },
    { code: '2020', name: 'GST Output Payable', type: 'LIABILITY' as const, category: 'TAX_LIABILITY', balance: new Prisma.Decimal('0.00') },
    { code: '3010', name: "Owner's Equity Capital", type: 'EQUITY' as const, category: 'EQUITY', balance: new Prisma.Decimal('500000.00') },
    { code: '4010', name: 'Sales Revenue', type: 'REVENUE' as const, category: 'OPERATING_REVENUE', balance: new Prisma.Decimal('125000.00') },
    { code: '5010', name: 'Cost of Goods Sold', type: 'EXPENSE' as const, category: 'DIRECT_EXPENSE', balance: new Prisma.Decimal('40000.00') },
    { code: '5020', name: 'Office Rent & Utilities', type: 'EXPENSE' as const, category: 'INDIRECT_EXPENSE', balance: new Prisma.Decimal('10000.00') },
  ];

  const createdAccounts: Record<string, string> = {};

  for (const acc of accountsData) {
    const record = await prisma.account.upsert({
      where: {
        businessId_code: {
          businessId: business.id,
          code: acc.code,
        },
      },
      update: {
        name: acc.name,
        type: acc.type,
      },
      create: {
        businessId: business.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        category: acc.category,
        currency: 'INR',
        balance: acc.balance,
      },
    });
    createdAccounts[acc.code] = record.id;
  }
  console.log(`✅ Chart of Accounts seeded: ${Object.keys(createdAccounts).length} accounts.`);

  // 5. Seed Balanced Demo Transactions
  const existingTxn = await prisma.transaction.findFirst({
    where: { businessId: business.id, transactionNumber: 'TXN-DEMO-0001' },
  });

  if (!existingTxn) {
    await prisma.transaction.create({
      data: {
        businessId: business.id,
        transactionNumber: 'TXN-DEMO-0001',
        description: 'Initial Equity Capital Infusion via Bank Wire',
        status: 'POSTED',
        requiresHumanReview: false,
        verifiedStatus: 'VERIFIED',
        createdById: adminUser.id,
        entries: {
          create: [
            {
              accountId: createdAccounts['1020'], // Bank A/C Debit
              debit: new Prisma.Decimal('500000.00'),
              credit: new Prisma.Decimal('0.00'),
              description: 'Funds received in HDFC Bank A/C',
            },
            {
              accountId: createdAccounts['3010'], // Owner's Equity Credit
              debit: new Prisma.Decimal('0.00'),
              credit: new Prisma.Decimal('500000.00'),
              description: 'Capital credited to equity',
            },
          ],
        },
      },
    });
    console.log('✅ Demo balanced transaction TXN-DEMO-0001 created.');
  }

  const existingSaleTxn = await prisma.transaction.findFirst({
    where: { businessId: business.id, transactionNumber: 'TXN-DEMO-0002' },
  });

  if (!existingSaleTxn) {
    await prisma.transaction.create({
      data: {
        businessId: business.id,
        transactionNumber: 'TXN-DEMO-0002',
        description: 'Sale of goods received in cash',
        status: 'POSTED',
        requiresHumanReview: false,
        verifiedStatus: 'VERIFIED',
        createdById: staffUser.id,
        entries: {
          create: [
            {
              accountId: createdAccounts['1010'], // Cash Debit
              debit: new Prisma.Decimal('50000.00'),
              credit: new Prisma.Decimal('0.00'),
              description: 'Cash payment received from retail customer',
            },
            {
              accountId: createdAccounts['4010'], // Sales Revenue Credit
              debit: new Prisma.Decimal('0.00'),
              credit: new Prisma.Decimal('50000.00'),
              description: 'Retail trading revenue recorded',
            },
          ],
        },
      },
    });
    console.log('✅ Demo balanced transaction TXN-DEMO-0002 created.');
  }

  console.log('✨ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
