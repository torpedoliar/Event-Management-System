import { describe, expect, it, vi } from 'vitest';
import { findCachedGuests, localGuestToGuest, type CachedGuestStore } from './offline-lookup';
import type { LocalGuest } from '@/lib/indexeddb';

const localGuest = (over: Partial<LocalGuest> = {}): LocalGuest => ({
  id: 'g1',
  guestId: 'TAMU-001',
  name: 'Budi Santoso',
  checkedIn: false,
  checkinCount: 0,
  updatedAt: '2026-10-27T00:00:00Z',
  ...over,
});

const store = (guests: LocalGuest[], exact: LocalGuest | null = null): CachedGuestStore => ({
  getCachedGuestByGuestId: vi.fn().mockResolvedValue(exact),
  getAllCachedGuests: vi.fn().mockResolvedValue(guests),
});

describe('findCachedGuests', () => {
  it('memakai jalur cepat saat guestId cocok persis', async () => {
    const exact = localGuest({ guestId: 'TAMU-009' });
    const s = store([], exact);

    const result = await findCachedGuests(s, 'TAMU-009');

    expect(result).toEqual([exact]);
    expect(s.getAllCachedGuests).not.toHaveBeenCalled();
  });

  it('membersihkan isi QR berbentuk URL sebelum mencari', async () => {
    const s = store([]);
    await findCachedGuests(s, 'https://event.example.com/checkin/TAMU-001');

    expect(s.getCachedGuestByGuestId).toHaveBeenCalledWith('TAMU-001');
  });

  it('mencocokkan guestId tanpa membedakan huruf besar/kecil', async () => {
    const guest = localGuest({ guestId: 'TAMU-001' });
    const result = await findCachedGuests(store([guest]), 'tamu-001');

    expect(result).toEqual([guest]);
  });

  it('mencocokkan nama persis tanpa membedakan huruf besar/kecil', async () => {
    const guest = localGuest({ guestId: 'X-1', name: 'Budi Santoso' });
    const result = await findCachedGuests(store([guest]), 'budi santoso');

    expect(result).toEqual([guest]);
  });

  it('mengembalikan beberapa kandidat bila ada duplikat', async () => {
    const a = localGuest({ id: 'a', guestId: 'TAMU-001' });
    const b = localGuest({ id: 'b', guestId: 'TAMU-001' });

    const result = await findCachedGuests(store([a, b]), 'TAMU-001');
    expect(result).toHaveLength(2);
  });

  it('mengembalikan daftar kosong bila tidak ada yang cocok', async () => {
    const result = await findCachedGuests(store([localGuest()]), 'TIDAK-ADA');
    expect(result).toEqual([]);
  });

  it('tidak mencocokkan nama sebagian (harus sama persis)', async () => {
    const guest = localGuest({ guestId: 'X-1', name: 'Budi Santoso' });
    const result = await findCachedGuests(store([guest]), 'Budi');
    expect(result).toEqual([]);
  });
});

describe('localGuestToGuest', () => {
  it('memetakan field cache ke bentuk Guest', () => {
    const mapped = localGuestToGuest(
      localGuest({
        id: 'g9',
        guestId: 'TAMU-009',
        name: 'Siti',
        checkedIn: true,
        checkinCount: 2,
        lastCheckinAt: '2026-10-27T10:00:00Z',
        photoUrl: '/uploads/photos/x.jpg',
      }),
    );

    expect(mapped).toEqual({
      id: 'g9',
      guestId: 'TAMU-009',
      name: 'Siti',
      queueNumber: 0,
      tableLocation: '',
      checkedIn: true,
      checkedInAt: '2026-10-27T10:00:00Z',
      checkinCount: 2,
      photoUrl: '/uploads/photos/x.jpg',
    });
  });

  it('mengisi nomor antrean dan meja dengan nilai netral', () => {
    const mapped = localGuestToGuest(localGuest());
    expect(mapped.queueNumber).toBe(0);
    expect(mapped.tableLocation).toBe('');
  });
});
