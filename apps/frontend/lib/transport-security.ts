/**
 * Determine the original client transport when Next.js is behind a reverse
 * proxy. Only trust the first X-Forwarded-Proto value; direct requests fall
 * back to the URL protocol.
 */
export function isSecureRequest(input: {
  forwardedProto: string | null;
  urlProtocol: string;
}): boolean {
  const forwarded = input.forwardedProto?.split(',')[0]?.trim().toLowerCase();
  if (forwarded) return forwarded === 'https';
  return input.urlProtocol.toLowerCase() === 'https:';
}

export function transportSecurityHeaders(isHttps: boolean): Record<string, string> {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https: wss:",
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];

  // HTTP/LAN installations must be allowed to load their same-origin assets
  // over HTTP. For HTTPS deployments behind NPM, upgrade accidental insecure
  // subresources and send HSTS.
  if (isHttps) csp.push('upgrade-insecure-requests');

  const headers: Record<string, string> = {
    'Content-Security-Policy': csp.join('; '),
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), geolocation=(), microphone=()',
  };

  if (isHttps) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }

  return headers;
}
