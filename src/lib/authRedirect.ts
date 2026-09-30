export function getSafeAuthRedirect(candidate: string | null, siteOrigin: string): string {
  if (!candidate?.startsWith('/') || candidate.startsWith('//')) {
    return '/';
  }

  try {
    const destination = new URL(candidate, siteOrigin);
    const configuredOrigin = new URL(siteOrigin).origin;

    if (destination.origin !== configuredOrigin) {
      return '/';
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/';
  }
}
