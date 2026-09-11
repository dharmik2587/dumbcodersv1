import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/auth/server';
import { failure } from '@/lib/http';
import { AppError, classifyDbError, ErrorCodes } from './errors';
import { logger } from './logger';
import { getRequestId } from './request-id';

export interface ApiHandlerMeta {
  api: string;
  operation?: string;
  requireAuth?: boolean;
}

export interface ApiContext<P = unknown> {
  req: NextRequest;
  requestId: string;
  userId?: string;
  params: Promise<P>;
}

export function withApiHandler<P = unknown>(
  meta: ApiHandlerMeta,
  handler: (ctx: ApiContext<P>) => Promise<Response>
) {
  return async (req: NextRequest, context?: { params?: Promise<P> }): Promise<Response> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);
    const params = context?.params ?? (Promise.resolve({}) as Promise<P>);
    let userId: string | undefined;

    if (meta.requireAuth) {
      try {
        userId = await requireUserId();
      } catch {
        logger.warn('Unauthorized request', {
          requestId,
          api: meta.api,
          operation: meta.operation,
          errorCode: ErrorCodes.UNAUTHORIZED,
          durationMs: Date.now() - startTime,
        });

        return failure('UNAUTHORIZED', 'Authentication is required for this action.', 401, {
          api: meta.api,
          requestId,
        });
      }
    }

    try {
      const response = await handler({
        req,
        requestId,
        userId,
        params,
      });

      // Ensure X-Request-ID header is always attached
      const headers = new Headers(response.headers);
      if (!headers.has('X-Request-ID')) {
        headers.set('X-Request-ID', requestId);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      let appError: AppError;

      if (err instanceof AppError) {
        appError = err;
      } else {
        appError = classifyDbError(err, {
          api: meta.api,
          operation: meta.operation,
          requestId,
        });
      }

      // Server-side structured JSON logging with complete stack trace
      logger.error(appError.message, {
        requestId,
        api: meta.api,
        operation: meta.operation || appError.operation,
        userId,
        errorCode: appError.code,
        provider: appError.provider,
        durationMs,
        stack: err instanceof Error ? err.stack : undefined,
      });

      // Safe production response without leaking server paths or stack traces
      return failure(
        appError.code,
        appError.message,
        appError.statusCode,
        {
          api: meta.api,
          requestId,
          provider: appError.provider,
        }
      );
    }
  };
}
