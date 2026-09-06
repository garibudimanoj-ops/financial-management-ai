import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
    throw new Error('DATABASE_URL is not set. Check your .env file.');
}

// Supabase connection currently presents a certificate chain that
// Node/pg may reject locally. Remove sslmode from the URL and
// explicitly configure the pg SSL behavior.
const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.delete('sslmode');

const pool = new Pool({
    connectionString: connectionUrl.toString(),
    ssl: {
        rejectUnauthorized: false,
    },
});

const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}