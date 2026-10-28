import { AddressInfo } from 'net';
import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerModule } from '@nestjs/throttler';
import { StationThrottlerGuard } from './station-throttler.guard';

/**
 * Tes ini membuktikan DUA hal sekaligus:
 *
 *   1. Throttling benar-benar menolak permintaan setelah batas terlampaui
 *      (bukan sekadar menghasilkan string kunci yang benar).
 *   2. Batas dihitung PER STATION, bukan per IP — sehingga 20 station di
 *      belakang satu NAT tidak saling memblokir.
 *
 * Poin kedua adalah alasan utama guard ini ada: throttling berbasis IP akan
 * melumpuhkan seluruh kiosk di venue yang berbagi satu IP publik.
 */

const LIMIT = 3;

@Controller('t')
class TestController {
  @Throttle({ long: { limit: LIMIT, ttl: 60000 } })
  @Post('checkin')
  checkin(@Body() _body: Record<string, unknown>) {
    return { ok: true };
  }

  // Tanpa override: memakai batas global dari modul.
  @Get('plain')
  plain() {
    return { ok: true };
  }
}

describe('StationThrottlerGuard', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'long', ttl: 60000, limit: 1000 }],
        }),
      ],
      controllers: [TestController],
      providers: [{ provide: APP_GUARD, useClass: StationThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const post = (headers: Record<string, string> = {}, body: Record<string, unknown> = {}) =>
    fetch(`${baseUrl}/t/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  /** Mengirim N permintaan dan mengembalikan daftar status. */
  const statuses = async (
    n: number,
    headers: Record<string, string> = {},
    body: Record<string, unknown> = {},
  ) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      out.push((await post(headers, body)).status);
    }
    return out;
  };

  it('menolak permintaan yang melewati batas (429)', async () => {
    const result = await statuses(LIMIT + 2, { 'X-Station-Id': 'st-limit' });

    expect(result.slice(0, LIMIT)).toEqual(Array(LIMIT).fill(201));
    expect(result[LIMIT]).toBe(429);
    expect(result[LIMIT + 1]).toBe(429);
  });

  it('station berbeda memiliki kuota terpisah meski berasal dari IP yang sama', async () => {
    // 20 station, masing-masing menghabiskan kuotanya.
    // Semua berasal dari 127.0.0.1 — persis kondisi di venue (satu NAT).
    for (let i = 0; i < 20; i++) {
      const result = await statuses(LIMIT, { 'X-Station-Id': `station-${i}` });
      expect(result).toEqual(Array(LIMIT).fill(201));
    }
  });

  it('stationId dari body juga dipakai sebagai kunci', async () => {
    const result = await statuses(LIMIT + 1, {}, { stationId: 'st-body' });

    expect(result.slice(0, LIMIT)).toEqual(Array(LIMIT).fill(201));
    expect(result[LIMIT]).toBe(429);
  });

  it('dua station yang menghabiskan kuota tidak saling memengaruhi', async () => {
    const a1 = await statuses(LIMIT + 1, { 'X-Station-Id': 'st-a' });
    expect(a1[LIMIT]).toBe(429);

    // Station lain tetap bisa bekerja.
    const b = await statuses(LIMIT, { 'X-Station-Id': 'st-b' });
    expect(b).toEqual(Array(LIMIT).fill(201));
  });

  it('tanpa stationId jatuh ke kunci IP, dan stationId tidak valid tidak membuat kuota baru', async () => {
    // Nilai-nilai ini TIDAK boleh lolos validasi. Semuanya berbagi kunci IP
    // yang sama, sehingga total hanya LIMIT permintaan yang diizinkan.
    const invalidIds = [
      'a'.repeat(100), // terlalu panjang
      'station:with:colon', // karakter terlarang
      '../admin', // path traversal
      'x'.repeat(65),
    ];

    const first = await statuses(LIMIT, { 'X-Station-Id': invalidIds[0] });
    expect(first).toEqual(Array(LIMIT).fill(201));

    // ID tidak valid berbeda tetap memakai kuota IP yang sudah habis.
    for (const id of invalidIds.slice(1)) {
      const r = await post({ 'X-Station-Id': id });
      expect(r.status).toBe(429);
    }
  });

  it('tanpa header sama sekali tetap memakai kuota IP yang sama', async () => {
    // Test sebelumnya sudah menghabiskan kuota IP, jadi ini harus ditolak.
    const r = await post();
    expect(r.status).toBe(429);
  });
});
