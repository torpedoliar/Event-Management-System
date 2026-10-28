/**
 * Utilitas parsing hasil pemindaian QR.
 *
 * Fungsi murni tanpa ketergantungan React — dipisahkan dari halaman kiosk
 * agar dapat diuji langsung.
 */

/**
 * Membersihkan isi QR.
 *
 * Beberapa pembuat QR menyimpan URL lengkap (mis. `https://host/checkin/TAMU-001`)
 * alih-alih ID saja. Dalam kasus itu, segmen terakhir path diambil sebagai ID.
 */
export function cleanQrContent(text: string): string {
  if (!text) return '';

  try {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const parts = url.pathname.split('/').filter((p) => p.trim() !== '');
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    }
  } catch {
    // Bukan URL yang valid — kembalikan apa adanya.
  }

  return text;
}

/**
 * Menebak apakah teks yang dipindai adalah nama orang, bukan ID tamu.
 *
 * ID tamu di sistem ini berupa huruf kapital, angka, strip, dan garis bawah
 * (mis. `TAMU-001`). Nama orang biasanya mengandung huruf kecil dan spasi,
 * serta tidak mengandung angka.
 */
export function isNameSearchQuery(text: string): boolean {
  const query = text.trim();
  return !!query && !/[\d-]/.test(query) && !/^[A-Z0-9_-]+$/.test(query);
}
