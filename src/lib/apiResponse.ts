import { NextResponse } from 'next/server';
import { AppError } from './errors';

export interface StructuredErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Defensive error-handling wrapper for Next.js API route handlers.
 * Catches known AppErrors and unexpected exceptions, returning uniform structured JSON.
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<Response | NextResponse>>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (err: any) {
      console.error('API Error:', err);

      if (err instanceof AppError) {
        return NextResponse.json(
          {
            error: err.message,
            code: err.code,
            details: err.details,
          } as StructuredErrorResponse,
          { status: err.statusCode }
        );
      }

      // Handle Prisma errors
      if (err?.code && typeof err.code === 'string' && err.code.startsWith('P')) {
        return NextResponse.json(
          {
            error: 'Database operation failed',
            code: err.code,
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
          } as StructuredErrorResponse,
          { status: 500 }
        );
      }

      const errorMessage = err?.message || 'Internal Server Error';
      return NextResponse.json(
        {
          error: errorMessage,
          code: 'INTERNAL_SERVER_ERROR',
        } as StructuredErrorResponse,
        { status: 500 }
      );
    }
  }) as T;
}

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
