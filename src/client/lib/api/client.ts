import { supabase } from '../auth';

const API_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_APP_URL || '');

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
      };
    }
  } catch (e) {
    // No session, continue without auth
  }
  return {};
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public requestId?: string,
    public api?: string,
    public provider?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const headerRequestId = response.headers.get('X-Request-ID') || response.headers.get('x-request-id');

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorCode: string | undefined;
    let requestId = headerRequestId || undefined;
    let api: string | undefined;
    let provider: string | undefined;

    if (isJson) {
      try {
        const data = await response.json();
        errorMessage =
          data.error?.message || data.message || (typeof data.error === 'string' ? data.error : errorMessage);
        errorCode = data.error?.code || data.code;
        requestId = data.error?.requestId || headerRequestId || undefined;
        api = data.error?.api || data.api;
        provider = data.error?.provider || data.provider;
      } catch {
        // If JSON parsing fails, use default error message
      }
    }

    // Structured console error per PRD Section 45
    console.error(
      `[HackMate API Error]\nAPI: ${api || response.url}\nCode: ${errorCode || 'UNKNOWN'}\nRequest ID: ${requestId || 'N/A'}${provider ? `\nProvider: ${provider}` : ''}`
    );

    throw new ApiError(errorMessage, response.status, errorCode, requestId, api, provider);
  }

  if (isJson) {
    return response.json();
  }

  throw new Error('Unsupported response format');
}

export async function get<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'include',
  });

  return handleResponse<T>(response);
}

export async function post<T>(
  endpoint: string,
  data?: unknown,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  return handleResponse<T>(response);
}

export async function put<T>(
  endpoint: string,
  data?: unknown,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  return handleResponse<T>(response);
}

export async function patch<T>(
  endpoint: string,
  data?: unknown,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  return handleResponse<T>(response);
}

export async function del<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'include',
  });

  return handleResponse<T>(response);
}

export const apiClient = {
  get,
  post,
  put,
  patch,
  delete: del,
};