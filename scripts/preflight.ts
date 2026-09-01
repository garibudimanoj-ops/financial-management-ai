/**
 * Preflight Check Script
 * Validates required environment variables and database connectivity before running migrations or server.
 */
import 'dotenv/config';
import { Pool } from 'pg';

async function runPreflight() {
  console.log('🔍 Running Financial Management AI Preflight Checks...\n');

  const requiredEnvVars = [
    'DATABASE_URL',
  ];

  const recommendedEnvVars = [
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  let hasError = false;

  console.log('Checking required environment variables:');
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`  ❌ Missing required environment variable: ${envVar}`);
      hasError = true;
    } else {
      console.log(`  ✅ ${envVar} is configured`);
    }
  }

  console.log('\nChecking recommended environment variables:');
  for (const envVar of recommendedEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`  ⚠️ Missing recommended environment variable: ${envVar}`);
    } else {
      console.log(`  ✅ ${envVar} is configured`);
    }
  }

  if (hasError) {
    console.error('\n❌ Preflight checks failed. Please copy .env.example to .env and configure the required variables.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.includes('mock')) {
    console.log('\nTesting database connection...');
    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      console.log('  ✅ Database connection successful!');
    } catch (err: any) {
      console.warn(`  ⚠️ Database connection warning: ${err.message}`);
      console.warn('  Note: Ensure PostgreSQL is running if you intend to perform live database queries.');
      await pool.end();
    }
  }

  console.log('\n✨ Preflight check completed successfully.');
}

runPreflight().catch((err) => {
  console.error('Fatal preflight error:', err);
  process.exit(1);
});
