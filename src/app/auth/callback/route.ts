import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasCoreDatabase } from '@/lib/db/core';
import { ensureStudentProfile } from '@/lib/profile/student';

import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/discover';

  // If this was a password recovery email, route to reset-password
  if (type === 'recovery') {
    next = '/reset-password';
  }

  // Supabase may redirect back with an error (e.g. user denied consent)
  if (error) {
    console.error('Auth callback received error from provider:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  const supabase = await createClient();

  let user = null;

  if (tokenHash && type) {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (verifyError) {
      console.error('Auth callback: verifyOtp failed:', verifyError.message);
      return NextResponse.redirect(
        `${origin}/sign-in?error=${encodeURIComponent(verifyError.message)}`
      );
    }
    user = data.user;
  } else if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('Auth callback: exchangeCodeForSession failed:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/sign-in?error=${encodeURIComponent(exchangeError.message)}`
      );
    }
    user = data.user;
  } else {
    console.error('Auth callback: neither code nor token_hash parameter in URL. Full URL:', request.url);
    return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
  }

  if (!user) {
    console.error('Auth callback returned no user');
    return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
  }

  if (hasCoreDatabase()) {
    try {
      await ensureStudentProfile(user);
    } catch (e) {
      console.error('Failed to auto-provision Neon student profile on callback:', e);
    }

    try {
      const { syncUserSocialIdentities } = await import('@/lib/db/queries/social-accounts');
      await syncUserSocialIdentities(user);
    } catch (e) {
      console.error('Failed to sync social identities on callback:', e);
      const msg = e instanceof Error ? e.message : 'Social identity sync failed';
      if (msg.includes('already connected')) {
        return NextResponse.redirect(`${origin}/profile?error=${encodeURIComponent(msg)}`);
      }
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
  const isLocalEnv = process.env.NODE_ENV === 'development';
  if (isLocalEnv) {
    // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
    return NextResponse.redirect(`${origin}${next}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  } else {
    return NextResponse.redirect(`${origin}${next}`);
  }
}

