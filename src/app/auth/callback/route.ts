import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimitShared, getClientIp } from '@/lib/rateLimit';
import { getSafeAuthRedirect } from '@/lib/authRedirect';
import { AppError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request.headers);
  const rateKey = `auth-callback:${clientIp}`;
  let isAllowed: boolean;
  try {
    isAllowed = await checkRateLimitShared(rateKey, 30, 60000);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 503) {
      return NextResponse.json(
        { error: 'Authentication callback is temporarily unavailable' },
        { status: 503 }
      );
    }
    throw error;
  }
  if (!isAllowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next') || '/';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  let siteOrigin: string;
  try {
    if (!siteUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Missing configured site URL');
      }
      siteOrigin = requestUrl.origin;
    } else {
      const configuredUrl = new URL(siteUrl);
      if (process.env.NODE_ENV === 'production' && configuredUrl.protocol !== 'https:') {
        throw new Error('Configured site URL must use HTTPS');
      }
      siteOrigin = configuredUrl.origin;
    }
  } catch {
    console.error('[Auth Callback] A valid HTTPS site origin is required in production');
    return NextResponse.json({ error: 'Authentication callback is unavailable' }, { status: 503 });
  }

  const safeNext = getSafeAuthRedirect(nextPath, siteOrigin);

  console.log(
    `[Auth Callback] origin=${requestUrl.origin}; configuredOrigin=${siteOrigin}; hasCode=${Boolean(code)}; next=${safeNext}`
  );

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?message=invalid-recovery-link', siteOrigin)
    );
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.warn('[Auth Callback] exchangeCodeForSession failed');

      return NextResponse.redirect(
        new URL('/login?message=invalid-recovery-link', siteOrigin)
      );
    }

    if (safeNext === '/reset-password') {
      return NextResponse.redirect(
        new URL('/reset-password', siteOrigin)
      );
    }

    return NextResponse.redirect(
      new URL(safeNext, siteOrigin)
    );
  } catch (error) {
    console.log(
      `[Auth Callback] unexpected error: ${error instanceof Error ? error.name : 'unknown'}`
    );

    return NextResponse.redirect(
      new URL('/login?message=invalid-recovery-link', siteOrigin)
    );
  }
}
