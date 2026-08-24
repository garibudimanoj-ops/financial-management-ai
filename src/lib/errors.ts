export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: ErrorCode = 'INTERNAL_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;

    switch (code) {
      case 'UNAUTHORIZED':
        this.statusCode = 401;
        break;
      case 'FORBIDDEN':
        this.statusCode = 403;
        break;
      case 'NOT_FOUND':
        this.statusCode = 404;
        break;
      case 'CONFLICT':
        this.statusCode = 409;
        break;
      case 'VALIDATION_ERROR':
        this.statusCode = 422;
        break;
      case 'RATE_LIMITED':
        this.statusCode = 429;
        break;
      case 'INTERNAL_ERROR':
      default:
        this.statusCode = 500;
        break;
    }

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function handleActionError(error: unknown): { error: string; code: ErrorCode } {
  if (error instanceof AppError) {
    return { error: error.message, code: error.code };
  }
  if (error instanceof Error) {
    // If it's a redirect, next/navigation throws an error that must be re-thrown
    if (error.message.includes('NEXT_REDIRECT') || (error as { digest?: string }).digest?.includes('NEXT_REDIRECT')) {
      throw error;
    }
    return { error: error.message, code: 'INTERNAL_ERROR' };
  }
  return { error: 'An unexpected internal error occurred.', code: 'INTERNAL_ERROR' };
}
