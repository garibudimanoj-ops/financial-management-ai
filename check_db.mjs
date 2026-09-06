import 'dotenv/config';
import { Pool } from 'pg';

const rawConnectionString = process.env.DATABASE_URL;
const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.delete('sslmode');

async function checkDb() {
  const pool = new Pool({
    connectionString: connectionUrl.toString(),
    ssl: { rejectUnauthorized: false },
  });

  try {
    const enumRes = await pool.query("SELECT typname FROM pg_type WHERE typname = 'PurchaseBillStatus'");
    console.log('PurchaseBillStatus enum:', enumRes.rows);

    const tablesRes = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Supplier', 'PurchaseBill', 'PurchaseBillItem', 'PurchasePayment', 'ExpenseCategory', 'Expense', 'PurchaseSequence', 'ExpenseSequence')
    `);
    console.log('Tables:', tablesRes.rows);

    const paymentColsRes = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Payment'
      AND column_name IN ('reversedAt', 'reversedById', 'reversalReason')
    `);
    console.log('Payment reversal columns:', paymentColsRes.rows);

    const migrationsRes = await pool.query(`
      SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10
    `);
    console.log('Recent migrations:', migrationsRes.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

checkDb();