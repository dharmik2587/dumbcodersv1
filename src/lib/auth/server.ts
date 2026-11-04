import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/env';

export async function getOptionalUser() {
  if (!hasSupabaseConfig()) return null;
  try {
    const supabase = await createClient();

    // 1. Check for Authorization Bearer token in request headers
    try {
      const headerList = await headers();
      const authHeader = headerList.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (token) {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (!error && user) return user;
        }
      }
    } catch {
      // headers() might not be available in non-request contexts
    }

    // 2. Check for cookie-based session
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch (error) {
    console.error('getOptionalUser error:', error);
    return null;
  }
}

export async function getOptionalUserId(): Promise<string | null> {
  const user = await getOptionalUser();
  return user?.id ?? null;
}

export async function requireUser() {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase is not configured');
  }

  const supabase = await createClient();

  // 1. Check for Authorization Bearer token in request headers
  try {
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) return user;
      }
    }
  } catch {
    // headers() might not be available in non-request contexts
  }

  // 2. Check for cookie-based session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthenticated');
  }

  return user;
}

export async function requireUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}
