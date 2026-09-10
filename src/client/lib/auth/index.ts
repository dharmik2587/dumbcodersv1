import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not found in environment variables');
}

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface AuthState {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
      [key: string]: unknown;
    };
  } | null;
  session: {
    access_token: string;
    refresh_token: string;
  } | null;
  loading: boolean;
}

/**
 * Get the current auth state using getUser() which validates the JWT
 * with the Supabase server. This is more reliable than getSession()
 * because it works properly with cookie-based auth (SSR/OAuth flows).
 */
export async function getCurrentAuthState(): Promise<AuthState> {
  try {
    // getUser() validates the token server-side and syncs from cookies
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, session: null, loading: false };
    }

    // Now get the session for tokens (needed for API calls)
    const { data: { session } } = await supabase.auth.getSession();

    return {
      user,
      session: session ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      } : null,
      loading: false,
    };
  } catch (error) {
    console.error('Error getting auth state:', error);
    return { user: null, session: null, loading: false };
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error('Please check your inbox to confirm your email before signing in.');
    }
    throw error;
  }

  // Double check email_confirmed_at if user returned without active session
  if (data.user && !data.user.email_confirmed_at && !data.session) {
    throw new Error('Please check your inbox to confirm your email before signing in.');
  }

  return data;
}

export async function signUp(email: string, password: string, metadata?: Record<string, string>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/onboarding` : undefined,
    },
  });

  if (error) throw error;
  return data;
}

export async function resetPasswordForEmail(email: string) {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw error;
  return data;
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;
  return data;
}

export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });

  if (error) throw error;
  return data;
}

export async function signInWithGoogle(redirectTo?: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo || '/discover')}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithGitHub(redirectTo?: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo || '/discover')}`,
      scopes: 'user:email read:user',
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(
  callback: (event: import('@supabase/supabase-js').AuthChangeEvent, session: import('@supabase/supabase-js').Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}