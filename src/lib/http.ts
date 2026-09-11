export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiFailure = {
  data: null;
  error: {
    code: string;
    message: string;
    api?: string;
    requestId?: string;
    provider?: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function success<T>(data: T, init?: ResponseInit & { requestId?: string }) {
  const headers = new Headers(init?.headers);
  if (init?.requestId) {
    headers.set('X-Request-ID', init.requestId);
  }
  return Response.json({ data, error: null } satisfies ApiSuccess<T>, {
    ...init,
    headers,
  });
}

export function failure(
  code: string,
  message: string,
  status: number,
  init?: ResponseInit & {
    api?: string;
    requestId?: string;
    provider?: string;
    details?: unknown;
  },
) {
  const headers = new Headers(init?.headers);
  if (init?.requestId) {
    headers.set('X-Request-ID', init.requestId);
  }
  return Response.json(
    {
      data: null,
      error: {
        code,
        message,
        ...(init?.api ? { api: init.api } : {}),
        ...(init?.requestId ? { requestId: init.requestId } : {}),
        ...(init?.provider ? { provider: init.provider } : {}),
        ...(init?.details !== undefined ? { details: init.details } : {}),
      },
    } satisfies ApiFailure,
    {
      ...init,
      status,
      headers,
    },
  );
}
