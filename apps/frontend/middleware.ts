import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // R-002: Tightened CSP policy for production HTML routes.
  // - script-src: 'unsafe-inline' is required by Next.js for inline __NEXT_DATA__ hydration scripts.
  //   'unsafe-eval' has been REMOVED (not needed in production builds).
  // - connect-src: restricted to 'self' and HTTPS/WSS only (no plain HTTP/WS).
  // - img-src: restricted to 'self' and HTTPS only (no plain HTTP).
  // - style-src: allows Google Fonts CSS via HTTPS.
  // - font-src: allows Google Fonts glyph files via HTTPS.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https: wss:;
    media-src 'self' https: blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');

  // R-003: Remove any residual serving-layer metadata that may leak through
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes — handled by backend)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sw.js, workbox (PWA service worker files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|workbox-).*)',
  ],
};
