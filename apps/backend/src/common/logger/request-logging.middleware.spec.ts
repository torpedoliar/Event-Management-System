import { EventEmitter } from 'events';
import type { NextFunction, Request, Response } from 'express';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { resolveRequestLevel } from './logger.service';

/**
 * Tes middleware logging permintaan.
 *
 * Tujuan utamanya bukan "middleware dipanggil", melainkan memastikan:
 *   - setiap respons membawa X-Request-Id yang bisa dicari di log,
 *   - health check TIDAK membanjiri log (600 baris/menit untuk 20 station),
 *   - status 5xx tercatat sebagai error, bukan info.
 */

describe('RequestLoggingMiddleware', () => {
  let logger: { logRequest: jest.Mock };
  let middleware: RequestLoggingMiddleware;

  beforeEach(() => {
    logger = { logRequest: jest.fn() };
    middleware = new RequestLoggingMiddleware(logger as any);
  });

  /** Response palsu: hanya butuh `on('finish')` dan `setHeader`. */
  const createRes = () => {
    const res = new EventEmitter() as unknown as Response & EventEmitter;
    const headers: Record<string, string> = {};
    (res as any).setHeader = (k: string, v: string) => {
      headers[k] = v;
    };
    (res as any).headers = headers;
    (res as any).statusCode = 200;
    return res as any;
  };

  const createReq = (overrides: Partial<Request> = {}) =>
    ({
      method: 'POST',
      url: '/api/public/guests/checkin',
      originalUrl: '/api/public/guests/checkin?foo=1',
      headers: {},
      ip: '10.0.0.5',
      ...overrides,
    }) as unknown as Request;

  const finish = (res: any, statusCode = 200) => {
    res.statusCode = statusCode;
    res.emit('finish');
  };

  it('menetapkan header X-Request-Id pada respons', () => {
    const req = createReq();
    const res = createRes();

    middleware.use(req, res, (() => {}) as NextFunction);

    expect(res.headers['X-Request-Id']).toBeDefined();
    expect((req as any).requestId).toBe(res.headers['X-Request-Id']);
  });

  it('memakai X-Request-Id dari klien bila ada (untuk penelusuran lintas layanan)', () => {
    const req = createReq({ headers: { 'x-request-id': 'trace-abc-123' } as any });
    const res = createRes();

    middleware.use(req, res, (() => {}) as NextFunction);

    expect(res.headers['X-Request-Id']).toBe('trace-abc-123');
  });

  it('mengabaikan X-Request-Id yang tidak wajar', () => {
    const req = createReq({ headers: { 'x-request-id': 'x'.repeat(500) } as any });
    const res = createRes();

    middleware.use(req, res, (() => {}) as NextFunction);

    expect(res.headers['X-Request-Id']).not.toBe('x'.repeat(500));
    expect(res.headers['X-Request-Id']).toHaveLength(36); // UUID
  });

  it('mencatat satu baris log saat respons selesai', () => {
    const req = createReq();
    const res = createRes();

    middleware.use(req, res, (() => {}) as NextFunction);
    finish(res, 201);

    expect(logger.logRequest).toHaveBeenCalledTimes(1);
    expect(logger.logRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/api/public/guests/checkin', // query string dibuang
        statusCode: 201,
        ip: '10.0.0.5',
      }),
    );
    expect(logger.logRequest.mock.calls[0][0].duration).toBeGreaterThanOrEqual(0);
  });

  it('TIDAK mencatat health check (mencegah 600 baris/menit)', () => {
    const req = createReq({
      method: 'GET',
      url: '/api/public/health',
      originalUrl: '/api/public/health?t=123',
    } as any);
    const res = createRes();

    middleware.use(req, res, (() => {}) as NextFunction);
    finish(res, 200);

    expect(logger.logRequest).not.toHaveBeenCalled();
  });

  it('TIDAK mencatat koneksi SSE', () => {
    const req = createReq({
      method: 'GET',
      url: '/api/public/stream',
      originalUrl: '/api/public/stream?token=abc',
    } as any);
    const res = createRes();

    middleware.use(req, res, (() => {}) as NextFunction);
    finish(res, 200);

    expect(logger.logRequest).not.toHaveBeenCalled();
  });

  it('meneruskan permintaan ke handler berikutnya', () => {
    const next = jest.fn();
    middleware.use(createReq(), createRes(), next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('resolveRequestLevel', () => {
  it.each([
    [200, 'info'],
    [304, 'info'],
    [400, 'warn'],
    [404, 'warn'],
    [500, 'error'],
    [503, 'error'],
    [undefined, 'info'],
  ])('status %s → level %s', (status, expected) => {
    expect(resolveRequestLevel(status as number | undefined)).toBe(expected);
  });
});
