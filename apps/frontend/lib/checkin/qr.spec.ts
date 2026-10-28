import { describe, expect, it } from 'vitest';
import { cleanQrContent, isNameSearchQuery } from './qr';

/**
 * Tes ini menjaga perilaku pemindaian QR di kiosk.
 *
 * Kesalahan di sini berdampak langsung di lapangan: QR yang sah gagal
 * dikenali, atau nama orang diperlakukan sebagai ID sehingga tamu tidak
 * ditemukan.
 */

describe('cleanQrContent', () => {
  it('mengembalikan teks apa adanya untuk ID biasa', () => {
    expect(cleanQrContent('TAMU-001')).toBe('TAMU-001');
  });

  it('mengambil segmen terakhir dari URL QR', () => {
    expect(cleanQrContent('https://event.example.com/checkin/TAMU-001')).toBe('TAMU-001');
  });

  it('mengabaikan query string pada URL QR', () => {
    expect(cleanQrContent('https://event.example.com/c/TAMU-042?src=badge')).toBe('TAMU-042');
  });

  it('mengambil segmen terakhir meski ada garis miring di akhir', () => {
    expect(cleanQrContent('https://event.example.com/checkin/TAMU-007/')).toBe('TAMU-007');
  });

  it('mengembalikan string kosong untuk input kosong', () => {
    expect(cleanQrContent('')).toBe('');
  });

  it('tidak melempar error untuk URL cacat', () => {
    expect(() => cleanQrContent('https://')).not.toThrow();
    expect(cleanQrContent('http://[invalid')).toBe('http://[invalid');
  });

  it('mempertahankan UUID internal', () => {
    const uuid = 'aaaaaaaa-0000-0000-0000-000000000001';
    expect(cleanQrContent(uuid)).toBe(uuid);
  });
});

describe('isNameSearchQuery', () => {
  it('menganggap nama orang sebagai pencarian nama', () => {
    expect(isNameSearchQuery('Budi Santoso')).toBe(true);
    expect(isNameSearchQuery('siti')).toBe(true);
  });

  it('menganggap ID tamu bukan pencarian nama', () => {
    expect(isNameSearchQuery('TAMU-001')).toBe(false);
    expect(isNameSearchQuery('GUEST_12')).toBe(false);
  });

  it('teks yang mengandung angka dianggap ID', () => {
    expect(isNameSearchQuery('Budi 2')).toBe(false);
  });

  it('mengabaikan spasi di awal/akhir', () => {
    expect(isNameSearchQuery('   Budi Santoso   ')).toBe(true);
  });

  it('string kosong bukan pencarian nama', () => {
    expect(isNameSearchQuery('')).toBe(false);
    expect(isNameSearchQuery('   ')).toBe(false);
  });

  it('huruf kapital semua tanpa angka dianggap bukan nama', () => {
    // Aturan saat ini: semua huruf kapital diasumsikan ID.
    expect(isNameSearchQuery('BUDI')).toBe(false);
  });
});
