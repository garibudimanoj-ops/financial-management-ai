import { NextResponse, NextRequest } from 'next/server';
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
type RouteContext<P = unknown> = { params: Promise<P> };
type RouteHandler<P = unknown> = (
  req: NextRequest,
  ctx?: RouteContext<P>
) => Promise<Response | NextResponse>;

export function withErrorHandling<T extends RouteHandler>(handler: T): T {
  return (async (req: NextRequest, ctx?: RouteContext) => {
    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
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
      if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string' && (err as { code: string }).code.startsWith('P')) {
        const prismaErr = err as { code: string; message?: string };
        return NextResponse.json(
          {
            error: 'Database operation failed',
            code: prismaErr.code,
            details: process.env.NODE_ENV === 'development' ? prismaErr.message : undefined,
          } as StructuredErrorResponse,
          { status: 500 }
        );
      }

      const errorMessage = err instanceof Error ? err.message : 'Internal Server Error';
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
