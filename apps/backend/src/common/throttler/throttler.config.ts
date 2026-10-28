import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Batas global (per kunci: stationId atau IP).
 *
 * Angka ini sengaja jauh lebih longgar dari sebelumnya (10/s, 50/10s, 200/min)
 * karena alasan operasional yang konkret:
 *
 *   - Halaman kiosk (connection-status.ts) melakukan polling
 *     /api/public/health setiap 2 detik.
 *   - 20 station di satu venue biasanya berbagi satu IP publik (NAT).
 *   - 20 x 30 polling/menit = 600 permintaan/menit dari SATU IP.
 *
 * Dengan batas lama (200/menit), mengaktifkan throttling akan melumpuhkan
 * seluruh kiosk. Dengan batas ini, penggunaan normal lolos sementara
 * penyalahgunaan masih dibatasi (tidak lagi tanpa batas sama sekali).
 *
 * Batas per-endpoint yang lebih spesifik diatur dengan @Throttle(...)
 * menggunakan konstanta di throttler.limits.ts.
 */
export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'short', ttl: 1000, limit: 20 },
    { name: 'medium', ttl: 10000, limit: 150 },
    { name: 'long', ttl: 60000, limit: 1200 },
  ],
};
