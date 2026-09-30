import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          requestHeaders.set('cookie', request.cookies.toString());
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isAuthPage =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password');

  const isPublicPath =
    path === '/' ||
    path.startsWith('/api/') ||
    path.startsWith('/auth/callback');

  const protectedPrefixes = [
    '/dashboard',
    '/ca-assistant',
    '/audit-logs',
    '/reports',
    '/inventory',
    '/customers',
    '/employees',
    '/payments',
    '/pos',
    '/products',
    '/expenses',
    '/suppliers',
    '/purchases',
    '/settings',
    '/onboarding',
    '/invite',
  ];

  const isProtectedPath = protectedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  const shouldRedirectAuthenticatedUser =
    path.startsWith('/login') ||
    path.startsWith('/signup');

  if (isPublicPath || isAuthPage) {
    if (user && shouldRedirectAuthenticatedUser) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return secureResponse(NextResponse.redirect(url));
    }

    return secureResponse(supabaseResponse);
  }

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return secureResponse(NextResponse.redirect(url));
  }

  return secureResponse(supabaseResponse);

  function secureResponse(response: NextResponse) {
    if (response !== supabaseResponse) {
      for (const cookie of supabaseResponse.cookies.getAll()) {
        response.cookies.set(cookie);
      }
    }
    response.headers.set('Content-Security-Policy', requestHeaders.get('Content-Security-Policy') ?? '');
    return response;
  }
}
