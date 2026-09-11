import crypto from 'node:crypto';

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

export function getRequestId(request?: Request | { headers?: Headers | { get(name: string): string | null } }): string {
  if (request?.headers) {
    const existing = request.headers.get('x-request-id') || request.headers.get('X-Request-ID');
    if (existing && existing.trim()) {
      return existing.trim();
    }
  }
  return generateRequestId();
}
