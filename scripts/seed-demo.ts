import { prisma } from "../src/lib/prisma";
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Demo seed script — idempotent, separate demo business only.
 * Safe to re-run. Uses Prisma directly; creates data only if missing.
 */

const DEMO_BIZ = 'biz-demo-001';

async function main() {
  // Idempotency: only create business if not exists
  const existingBiz = await prisma.business.findUnique({ where: { id: DEMO_BIZ } });
  if (!existingBiz) {
    await prisma.business.create({
      data: {
        id: DEMO_BIZ,
        name: 'Demo Financial Co',
        accountType: 'INDIVIDUAL',
        businessType: 'MANUFACTURING',
        country: 'INDIA',
        state: 'MAHARASHTRA',
        city: 'Mumbai',
        baseCurrency: 'INR',
        fiscalYearStart: '04-01',
        taxRegistrationStatus: true,
        taxId: '27AABCD1234Z',
      },
    });
    console.log('Demo business created:', DEMO_BIZ);
  } else {
    console.log('Demo business already exists:', DEMO_BIZ);
  }

  console.log('Seed complete. No production data overwritten.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
