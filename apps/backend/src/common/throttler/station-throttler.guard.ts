import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Format stationId yang diterima. Dibatasi ketat agar nilai dari klien tidak
 * bisa dipakai untuk:
 *   - membuat kunci tak terbatas (memori), atau
 *   - menyamar sebagai station lain dengan menyisipkan pemisah.
 */
const STATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Guard throttling yang mengunci berdasarkan **station**, bukan IP.
 *
 * Latar belakang: seluruh kiosk di satu venue biasanya keluar melalui satu IP
 * publik (NAT). Throttling berbasis IP membuat 20 station saling memblokir —
 * satu station yang memindai cepat bisa membuat station lain gagal.
 *
 * Urutan penentuan kunci:
 *   1. `stationId` dari body / header `X-Station-Id` / query
 *   2. IP klien (fallback untuk halaman admin dan permintaan tanpa station)
 *
 * Catatan: `req.ip` hanya bermakna jika `trust proxy` diatur. Tanpa itu,
 * semua permintaan di belakang reverse proxy akan terlihat berasal dari IP
 * proxy. Lihat `main.ts`.
 */
@Injectable()
export class StationThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const stationId = this.extractStationId(req);
    if (stationId) return `station:${stationId}`;

    return `ip:${this.extractIp(req)}`;
  }

  private extractStationId(req: Record<string, any>): string | null {
    const candidates = [req.body?.stationId, req.headers?.['x-station-id'], req.query?.stationId];

    for (const raw of candidates) {
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (STATION_ID_PATTERN.test(trimmed)) return trimmed;
      }
    }

    return null;
  }

  private extractIp(req: Record<string, any>): string {
    // `req.ip` sudah memperhitungkan X-Forwarded-For sesuai pengaturan
    // `trust proxy`. Membaca header itu secara manual akan membuka celah:
    // klien bisa memalsukan header untuk mendapat kuota baru tanpa batas.
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
