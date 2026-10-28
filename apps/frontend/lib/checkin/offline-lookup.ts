import type { LocalGuest } from '@/lib/indexeddb';
import { cleanQrContent } from './qr';
import type { Guest } from './types';

/**
 * Sumber data cache tamu (IndexedDB).
 *
 * Didefinisikan sebagai antarmuka sempit agar logika pencarian dapat diuji
 * tanpa menyentuh IndexedDB sungguhan.
 */
export interface CachedGuestStore {
  getCachedGuestByGuestId(guestId: string): Promise<LocalGuest | null>;
  getAllCachedGuests(): Promise<LocalGuest[]>;
}

/**
 * Mengubah tamu hasil cache lokal menjadi bentuk `Guest` yang dipakai UI.
 *
 * Tamu dari cache tidak memiliki nomor antrean maupun lokasi meja, sehingga
 * keduanya diisi nilai netral.
 */
export function localGuestToGuest(local: LocalGuest): Guest {
  return {
    id: local.id,
    guestId: local.guestId,
    name: local.name,
    queueNumber: 0,
    tableLocation: '',
    checkedIn: local.checkedIn,
    checkedInAt: local.lastCheckinAt,
    checkinCount: local.checkinCount,
    photoUrl: local.photoUrl,
  };
}

/**
 * Mencari tamu di cache offline saat server tidak dapat dihubungi.
 *
 * Urutan pencarian:
 *   1. Cocok persis berdasarkan `guestId` (jalur cepat, satu query).
 *   2. Bila tidak ada, cocokkan `guestId` yang sudah dibersihkan dari QR
 *      ATAU nama yang sama persis (tanpa membedakan huruf besar/kecil).
 *
 * Pencocokan sengaja ketat agar operator tidak salah memilih tamu saat offline.
 */
export async function findCachedGuests(
  store: CachedGuestStore,
  rawQuery: string,
): Promise<LocalGuest[]> {
  const cleaned = cleanQrContent(rawQuery);

  const exact = await store.getCachedGuestByGuestId(cleaned);
  if (exact) return [exact];

  const all = await store.getAllCachedGuests();
  const cleanedLower = cleaned.toLowerCase();
  const rawLower = rawQuery.toLowerCase();

  return all.filter(
    (g) => g.guestId.toLowerCase() === cleanedLower || g.name.toLowerCase() === rawLower,
  );
}
