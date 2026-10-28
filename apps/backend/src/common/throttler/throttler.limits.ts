/**
 * Batas throttling per jenis endpoint.
 *
 * Semua angka adalah **per kunci** (stationId bila tersedia, selain itu IP).
 * Nilai sengaja longgar untuk jalur kiosk, karena:
 *
 *   - Satu venue biasanya berbagi satu IP publik (NAT).
 *   - Station memindai QR berturut-turut saat antrean ramai.
 *   - Halaman kiosk melakukan polling health tiap 2 detik.
 *
 * Prioritasnya adalah: **jangan sampai operasi event gagal**, tetapi endpoint
 * publik tidak lagi tanpa batas sama sekali.
 */

/** Operasi check-in/pencarian kiosk — dipakai paling sering. */
export const KIOSK_LIMIT = {
  short: { limit: 30, ttl: 1000 },
  medium: { limit: 300, ttl: 10000 },
  long: { limit: 2400, ttl: 60000 },
};

/**
 * Health check. Batas jauh lebih tinggi karena setiap perangkat memanggilnya
 * tiap 2 detik: 20 station = 600 permintaan/menit dari satu IP.
 */
export const KIOSK_HEALTH_LIMIT = {
  short: { limit: 60, ttl: 1000 },
  medium: { limit: 600, ttl: 10000 },
  long: { limit: 4000, ttl: 60000 },
};

/** Satu koneksi SSE per perangkat; tidak wajar bila sering dibuka ulang. */
export const PUBLIC_STREAM_LIMIT = {
  long: { limit: 60, ttl: 60000 },
};

/** Endpoint baca publik (halaman registrasi, landing page). */
export const PUBLIC_READ_LIMIT = {
  long: { limit: 600, ttl: 60000 },
};

/**
 * Pengiriman formulir registrasi publik.
 * Ini satu-satunya endpoint publik yang menulis data tanpa autentikasi,
 * sehingga batasnya paling ketat untuk mencegah spam pendaftaran.
 */
export const PUBLIC_SUBMIT_LIMIT = {
  short: { limit: 1, ttl: 1000 },
  medium: { limit: 5, ttl: 10000 },
  long: { limit: 20, ttl: 60000 },
};
