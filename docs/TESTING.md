# Menjalankan Tes

> Tes integrasi memakai **PostgreSQL sungguhan**, bukan mock. Perilaku yang
> diuji — konkurensi, transaksi, advisory lock — hanya nyata di atas database
> sesungguhnya.

---

## Kenapa ada tes konkurensi

Aplikasi ini dipakai di lapangan dengan **banyak station paralel** dan mode
offline. Bug yang paling berbahaya bukan "error saat klik", melainkan
**penulisan ganda yang tidak terlihat**: satu tamu tercatat check-in berkali-kali
karena dua perangkat menekan tombol pada saat bersamaan.

Bug tersebut tidak akan pernah tertangkap oleh pengujian manual (jendela
balapannya milidetik) maupun oleh mock. Karena itu tesnya menjalankan
permintaan **benar-benar paralel** ke database nyata.

---

## Menyiapkan database uji

```bash
bash scripts/test-db.sh
```

Skrip ini:
- menyalakan container `guest-test-db` di port **55433** (terpisah dari port 5432 produksi),
- memakai database `guest_registry_test` (tidak mungkin tertukar dengan data nyata),
- menerapkan migrasi lewat `prisma migrate deploy`.

Perintah lain:

```bash
bash scripts/test-db.sh --reset   # buat ulang dari nol
bash scripts/test-db.sh --down    # hapus container
```

---

## Menjalankan tes

```bash
cd apps/backend

# seluruh tes
npm test

# satu berkas
npx jest src/guests/guests.checkin.spec.ts

# satu skenario
npx jest -t "mode single"

# mode CI
npm run test:ci
```

Di Windows tanpa Git Bash, set variabelnya manual:

```powershell
$env:TEST_DATABASE_URL="postgresql://postgres:test@localhost:55433/guest_registry_test?schema=public"
cd apps\backend
npx jest --runInBand
```

---

## Cakupan saat ini

### Backend (Jest + PostgreSQL sungguhan)

| Berkas | Yang diuji |
|---|---|
| [`guests.checkin.spec.ts`](../apps/backend/src/guests/guests.checkin.spec.ts) | Konkurensi `checkIn()` pada 3 mode: single, per-counter, dan multiple dengan batas |
| [`guests.offline.spec.ts`](../apps/backend/src/guests/guests.offline.spec.ts) | Konkurensi `syncBatchFromStation()` antar-station, `checkInOffline()`, dan idempotensi pengiriman ulang |
| [`prizes.draw.spec.ts`](../apps/backend/src/prizes/prizes.draw.spec.ts) | Undian hadiah: stok, duplikat, `allowMultipleWins`, undian serentak |
| [`bracket-engine.spec.ts`](../apps/backend/src/tournaments/bracket-engine.spec.ts) | Bagan turnamen: seeding, BYE auto-advance, wiring `nextMatchId` |
| [`public-registration.spec.ts`](../apps/backend/src/public-registration/public-registration.spec.ts) | Registrasi publik: kuota, jendela waktu, anti-duplikat, honeypot |
| [`station-throttler.guard.spec.ts`](../apps/backend/src/common/throttler/station-throttler.guard.spec.ts) | Throttling per-station lewat HTTP nyata |
| [`request-logging.middleware.spec.ts`](../apps/backend/src/common/logger/request-logging.middleware.spec.ts) | `X-Request-Id`, pemetaan level log, pengecualian health check |

### Frontend (Vitest + Testing Library)

```bash
cd apps/frontend
npm test
```

| Berkas | Yang diuji |
|---|---|
| [`lib/checkin/qr.spec.ts`](../apps/frontend/lib/checkin/qr.spec.ts) | Parsing isi QR (URL vs ID) dan deteksi pencarian nama |
| [`ScanHistory.spec.tsx`](../apps/frontend/components/checkin/ScanHistory.spec.tsx) | Daftar kosong tidak dirender; status scan dibedakan warna |
| [`CheckinHistory.spec.tsx`](../apps/frontend/components/checkin/CheckinHistory.spec.tsx) | Keadaan kosong, data tamu, foto vs placeholder |
| [`CheckinResults.spec.tsx`](../apps/frontend/components/checkin/CheckinResults.spec.tsx) | Hasil pencarian, status check-in, pemanggilan aksi |
| [`CheckinResultPopup.spec.tsx`](../apps/frontend/components/checkin/CheckinResultPopup.spec.tsx) | Popup berhasil/duplikat, riwayat, tombol sesuai hak akses |
| [`Banners.spec.tsx`](../apps/frontend/components/checkin/Banners.spec.tsx) | Banner notifikasi & penutupannya |
| [`SouvenirPopups.spec.tsx`](../apps/frontend/components/souvenir/SouvenirPopups.spec.tsx) | Popup souvenir berhasil & peringatan sudah diambil |
| [`PrizeSelector.spec.tsx`](../apps/frontend/components/luckydraw/PrizeSelector.spec.tsx) | Daftar hadiah, sisa stok, pemilihan hadiah |
| [`SearchPanel.spec.tsx`](../apps/frontend/components/checkin/SearchPanel.spec.tsx) | Enter untuk submit, status proses, tombol aksi |
| [`SouvenirResults.spec.tsx`](../apps/frontend/components/souvenir/SouvenirResults.spec.tsx) | Hasil pencarian, stok habis, ambil souvenir, panel hadiah |
| [`usePopupTimeout.spec.ts`](../apps/frontend/hooks/usePopupTimeout.spec.ts) | Timer popup: mulai ulang, pembatalan, pembersihan saat unmount |
| [`SouvenirSelector.spec.tsx`](../apps/frontend/components/souvenir/SouvenirSelector.spec.tsx) | Stok tersisa, stok habis, pemilihan souvenir |
| [`offline-lookup.spec.ts`](../apps/frontend/lib/checkin/offline-lookup.spec.ts) | Pencarian tamu di cache offline dan pemetaan ke `Guest` |

> Tes komponen ini adalah **jaring pengaman refactor**: setiap kali blok JSX
> dipindahkan keluar dari halaman monolitik, perilakunya dikunci di sini
> sebelum pemindahan berikutnya dilakukan.

Contoh skenario yang dikunci oleh tes:

- 20 permintaan check-in paralel untuk tamu yang sama → **tepat 1** berhasil.
- 10 permintaan paralel dari admin yang sama pada mode per-counter → **tepat 1**.
- 20 permintaan paralel dengan `maxCheckinCount = 3` → **tepat 3**.
- 6 station menyinkronkan tamu yang sama → **tepat 1** dihitung check-in, sisanya konflik.
- Pengiriman ulang dengan `clientTimestamp` sama → **idempoten**, tidak menambah baris.

---

## Membuktikan tes benar-benar menjaga

Tes yang tidak pernah gagal tidak menjaga apa pun. Untuk memastikan sebuah tes
konkurensi benar-benar menangkap regresi, lakukan **mutation test** singkat:

1. Nonaktifkan guard-nya. Contoh: ubah baris advisory lock menjadi komentar.
2. Jalankan tes yang relevan — ia **harus gagal**.
3. Pulihkan guard, jalankan ulang — ia **harus lulus**.

Praktik ini sudah dipakai saat memperbaiki race condition: dengan guard
dimatikan, tes langsung menangkap dua station yang sama-sama sukses.

---

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) menjalankan pada
setiap push/PR ke `main`:

1. `npm ci` (backend & frontend)
2. `prisma migrate deploy` ke database uji
3. **Cek drift migrasi** — memastikan `schema.prisma` dan `prisma/migrations/` tidak berbeda
4. `tsc --noEmit` (backend & frontend)
5. `jest --ci` (backend)
6. `next build` (frontend)

Langkah cek drift penting: tanpa itu, perubahan schema yang lupa dibuatkan
migrasi hanya akan ketahuan saat deploy produksi.

---

## Menambah tes baru

1. Buat berkas `*.spec.ts` di samping modul yang diuji.
2. Untuk tes yang menyentuh database, hubungkan `PrismaClient` ke
   `process.env.TEST_DATABASE_URL`.
3. Bersihkan tabel di `beforeEach` dengan urutan **anak dulu, induk kemudian**
   (mis. `prizeWinner` → `guestCheckin` → `guest` → `event`).
4. Jangan menambah `jest.mock` untuk hal yang sedang diuji — gunakan database
   sungguhan agar race dan transaksi benar-benar teruji.

> Catatan: `maxWorkers: 1` disetel sengaja. Semua tes berbagi satu database,
> sehingga berjalan paralel akan membuat tes saling menghapus data.
