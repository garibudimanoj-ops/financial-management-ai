import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Cache pool, adapter, and client together in globalThis to survive
// Turbopack/HMR hot-module reloads in development. Without this, each
// module re-evaluation creates a new orphaned Pool while the cached
// PrismaClient still references the old one, causing SocketTimeout errors.
const g = globalThis as unknown as {
  _prismaPool: Pool | undefined;
  _prismaClient: PrismaClient | undefined;
};

function buildPrismaClient(): PrismaClient {
  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error('DATABASE_URL is not set. Check your .env file.');
  }

  const connectionUrl = new URL(rawConnectionString);
  const isProduction = process.env.NODE_ENV === 'production';

  // Supabase direct connections require SSL but the pg driver treats
  // sslmode=require as verify-full in newer versions — strip it and
  // set ssl options directly so we control the behavior.
  connectionUrl.searchParams.delete('sslmode');

  const ca = process.env.SUPABASE_CA_CERT?.replace(/\\n/g, '\n');

  const pool = new Pool({
    connectionString: connectionUrl.toString(),
    ssl: isProduction
      ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
      : { rejectUnauthorized: false },
    // Keep connections alive to prevent silent drops from Supabase (~60s idle limit)
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // Fail fast so errors surface quickly instead of hanging for 20s+
    connectionTimeoutMillis: 10000,
    // Retire idle connections before the server-side idle timeout fires
    idleTimeoutMillis: 30000,
    // Stay within Supabase free-tier connection limits
    max: 5,
  });

  g._prismaPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = g._prismaClient ?? buildPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  g._prismaClient = prisma;
}
