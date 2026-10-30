import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isSecureRequest, transportSecurityHeaders } from '@/lib/transport-security';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const securityHeaders = transportSecurityHeaders(
    isSecureRequest({
      forwardedProto: request.headers.get('x-forwarded-proto'),
      urlProtocol: request.nextUrl.protocol,
    }),
  );

  for (const [name, value] of Object.entries(securityHeaders)) {
    response.headers.set(name, value);
  }

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
