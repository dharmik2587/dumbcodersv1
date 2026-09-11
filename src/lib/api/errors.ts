export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',
  DATABASE_CONSTRAINT: 'DATABASE_CONSTRAINT',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',

  // External Upstreams
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  UPSTREAM_RATE_LIMIT: 'UPSTREAM_RATE_LIMIT',
  UPSTREAM_BAD_RESPONSE: 'UPSTREAM_BAD_RESPONSE',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  UPSTREAM_PROVIDER_ERROR: 'UPSTREAM_PROVIDER_ERROR',

  // Pusher / Realtime
  PUSHER_ERROR: 'PUSHER_ERROR',
  PUSHER_AUTH_ERROR: 'PUSHER_AUTH_ERROR',
  PUSHER_NOT_CONFIGURED: 'PUSHER_NOT_CONFIGURED',

  // Ingestion & Providers
  INGESTION_ERROR: 'INGESTION_ERROR',
  INGESTION_PARTIAL: 'INGESTION_PARTIAL',
  PROVIDER_ERROR: 'PROVIDER_ERROR',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes] | string;

export interface AppErrorOptions {
  code: ErrorCode;
  statusCode?: number;
  api?: string;
  operation?: string;
  requestId?: string;
  provider?: string;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly api?: string;
  public readonly operation?: string;
  public readonly requestId?: string;
  public readonly provider?: string;
  public readonly details?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.api = options.api;
    this.operation = options.operation;
    this.requestId = options.requestId;
    this.provider = options.provider;
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Classifies a raw Postgres / Drizzle error into a structured AppError
 */
export function classifyDbError(
  err: unknown,
  context?: { api?: string; operation?: string; requestId?: string }
): AppError {
  if (err instanceof AppError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';

  // Postgres SQLSTATE codes
  // 23505: unique_violation
  if (code === '23505' || message.includes('unique constraint') || message.includes('duplicate key')) {
    return new AppError('A record with this information already exists.', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
      ...context,
      cause: err,
    });
  }

  // 23503: foreign_key_violation
  if (code === '23503' || message.includes('foreign key constraint')) {
    return new AppError('The operation references a related item that does not exist.', {
      code: ErrorCodes.DATABASE_CONSTRAINT,
      statusCode: 400,
      ...context,
      cause: err,
    });
  }

  // 57014: query_canceled / statement timeout
  if (code === '57014' || message.includes('timeout') || message.includes('canceling statement due to statement timeout')) {
    return new AppError('The database operation timed out.', {
      code: ErrorCodes.DATABASE_TIMEOUT,
      statusCode: 504,
      ...context,
      cause: err,
    });
  }

  // Connection refusal / termination
  if (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    message.includes('Connection terminated') ||
    message.includes('connection error')
  ) {
    return new AppError('Database is currently unavailable.', {
      code: ErrorCodes.DATABASE_UNAVAILABLE,
      statusCode: 503,
      ...context,
      cause: err,
    });
  }

  // Default database error
  return new AppError('Unable to complete database operation.', {
    code: ErrorCodes.DATABASE_ERROR,
    statusCode: 500,
    ...context,
    cause: err,
  });
}
