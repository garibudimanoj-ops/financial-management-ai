import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  try {
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    return NextResponse.json({
      status: 'ok',
      version: process.env.npm_package_version || 'unknown',
      db: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'degraded', db: 'blocked', environment: process.env.NODE_ENV || 'development', timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
