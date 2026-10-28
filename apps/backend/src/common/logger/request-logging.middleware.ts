import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { LoggerService } from './logger.service';

/**
 * Path yang tidak dicatat.
 *
 * `/public/health` dipanggil setiap 2 detik oleh setiap station. Dengan 20
 * station itu 600 baris log per menit hanya untuk health check, yang akan
 * menenggelamkan kejadian penting.
 *
 * `/public/stream` adalah koneksi SSE berumur panjang; mencatat saat
 * penutupannya tidak memberi informasi berguna.
 */
const SKIP_PATHS = ['/api/public/health', '/api/public/stream'];

/**
 * Memberi setiap permintaan sebuah `requestId`, mengembalikannya di header
 * `X-Request-Id`, dan mencatat satu baris log terstruktur saat selesai.
 *
 * Manfaat praktis: ketika operator melaporkan "tamu ini gagal check-in tadi",
 * ID dari header respons dapat dicari langsung di log untuk melihat seluruh
 * rantai kejadian permintaan tersebut.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = Date.now();

    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128
        ? incoming
        : randomUUID();

    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const path = (req.originalUrl || req.url || '').split('?')[0];
    const skipped = SKIP_PATHS.some((p) => path.startsWith(p));

    res.on('finish', () => {
      if (skipped) return;

      this.logger.logRequest({
        timestamp: new Date().toISOString(),
        message: `${req.method} ${path} ${res.statusCode}`,
        requestId,
        ip: req.ip,
        method: req.method,
        url: path,
        statusCode: res.statusCode,
        duration: Date.now() - startedAt,
      });
    });

    next();
  }
}
