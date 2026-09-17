import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next') || '/';

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    requestUrl.origin;

  const siteOrigin = new URL(siteUrl).origin;

  const safeNext =
    typeof nextPath === 'string' &&
    nextPath.startsWith('/') &&
    !nextPath.startsWith('//')
      ? nextPath
      : '/';

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
      console.log(
        `[Auth Callback] exchangeCodeForSession failed: ${error.message}`
      );

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
      `[Auth Callback] unexpected error: ${
        error instanceof Error ? error.message : 'unknown'
      }`
    );

    return NextResponse.redirect(
      new URL('/login?message=invalid-recovery-link', siteOrigin)
    );
  }
}
