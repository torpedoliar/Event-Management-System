import { describe, expect, it } from 'vitest';
import { isSecureRequest, transportSecurityHeaders } from './transport-security';

describe('transport security headers', () => {
  it('keeps same-origin assets on HTTP for LAN installations', () => {
    const secure = isSecureRequest({ forwardedProto: null, urlProtocol: 'http:' });
    const headers = transportSecurityHeaders(secure);

    expect(headers['Content-Security-Policy']).not.toContain('upgrade-insecure-requests');
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('enables HTTPS upgrades and HSTS for direct HTTPS', () => {
    const secure = isSecureRequest({ forwardedProto: null, urlProtocol: 'https:' });
    const headers = transportSecurityHeaders(secure);

    expect(headers['Content-Security-Policy']).toContain('upgrade-insecure-requests');
    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
  });

  it('recognizes HTTPS behind Nginx Proxy Manager', () => {
    const secure = isSecureRequest({ forwardedProto: 'https', urlProtocol: 'http:' });
    const headers = transportSecurityHeaders(secure);

    expect(secure).toBe(true);
    expect(headers['Content-Security-Policy']).toContain('upgrade-insecure-requests');
    expect(headers['Strict-Transport-Security']).toBeDefined();
  });

  it('uses only the first forwarded protocol value', () => {
    expect(isSecureRequest({ forwardedProto: 'https, http', urlProtocol: 'http:' })).toBe(true);
    expect(isSecureRequest({ forwardedProto: 'http, https', urlProtocol: 'https:' })).toBe(false);
  });
});
