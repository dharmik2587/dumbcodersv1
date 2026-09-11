export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  timestamp?: string;
  requestId?: string;
  api?: string;
  operation?: string;
  userId?: string;
  errorCode?: string;
  provider?: string;
  message: string;
  durationMs?: number;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export function logJson(entry: LogEntry): void {
  const payload = {
    timestamp: entry.timestamp || new Date().toISOString(),
    ...entry,
  };

  const line = JSON.stringify(payload);
  if (entry.level === 'error') {
    console.error(line);
  } else if (entry.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (msg: string, ctx?: Omit<LogEntry, 'level' | 'message'>) =>
    logJson({ level: 'info', message: msg, ...ctx }),
  warn: (msg: string, ctx?: Omit<LogEntry, 'level' | 'message'>) =>
    logJson({ level: 'warn', message: msg, ...ctx }),
  error: (msg: string, ctx?: Omit<LogEntry, 'level' | 'message'>) =>
    logJson({ level: 'error', message: msg, ...ctx }),
};
