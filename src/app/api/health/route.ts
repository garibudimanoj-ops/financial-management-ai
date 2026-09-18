import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      version: process.env.npm_package_version || 'unknown',
      db: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Health Check] Database check failed:', error);

    return NextResponse.json(
      {
        status: 'degraded',
        db: 'blocked',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
