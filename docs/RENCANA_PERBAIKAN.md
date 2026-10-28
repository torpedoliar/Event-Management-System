# Rencana Perbaikan — Registrasi Tamu / Event Management System

> Disusun dari audit menyeluruh codebase v1.6.0 (commit `dd0a4f7`, branch `main`).
> Setiap item memuat: **bukti**, **dampak**, **langkah**, **cara verifikasi**, dan **rollback**.

---

## ⚠️ Aturan Emas

1. **Jangan mengeksekusi item P0/P1 saat event berlangsung.** Semua perubahan skema & throttling menyentuh jalur check-in.
2. **Backup dulu, verifikasi restore-nya, baru ubah.** Backup yang belum pernah diuji restore = bukan backup.
3. Satu item = satu branch = satu PR. Jangan gabung migrasi DB dengan refactor UI.

---

## Ringkasan Prioritas

| # | Item | Prioritas | Dampak | Effort | Risiko perubahan |
|---|------|-----------|--------|--------|------------------|
| 1 | Sinkronisasi skema DB & hentikan `db push --accept-data-loss` | 🔴 P0 | Kehilangan data massal saat update | 1 hari | Tinggi (menyentuh data) |
| 2 | Uji & otomatiskan backup–restore | 🔴 P0 | Tidak ada jaring pengaman jika #1 gagal | 0,5 hari | Rendah |
| 3 | Tutup celah `RequireAuth` pada halaman admin | 🟠 P1 | Halaman admin terbuka tanpa login | 0,5 hari | Rendah |
| 4 | Perbaiki race condition `checkIn()` | 🟠 P1 | Double check-in saat 2 station bersamaan | 1–2 hari | Sedang |
| 5 | Rate limit publik berbasis `stationId`, bukan IP | 🟠 P1 | Endpoint publik terbuka; jika salah konfigurasi bisa lumpuhkan kiosk | 1 hari | Sedang–Tinggi |
| 6 | Bangun test suite (backend + e2e) | 🟡 P2 | Jaring pengaman untuk semua perubahan berikutnya | 5–7 hari | Rendah |
| 7 | Pecah file monolitik (checkin, souvenir, luckydraw) | 🟡 P2 | Maintainability, risiko regresi per perubahan | 3–5 hari | Sedang |
| 8 | Higiene dependensi & pembersihan repo | 🟢 P3 | Ukuran bundle, konsistensi tipe | 0,5 hari | Rendah |
| 9 | Observability & dokumentasi operasional | 🟢 P3 | Deteksi dini masalah saat event | 2 hari | Rendah |

**Urutan eksekusi yang disarankan:** 2 → 1 → 3 → 4 → 6 → 5 → 7 → 8 → 9.
Item 6 dinaikkan sebelum 5 & 7 karena keduanya butuh jaring pengaman.

---

## 📌 Status Pelaksanaan

| # | Item | Status | Bukti |
|---|------|--------|-------|
| 1 | Sinkronisasi skema DB | ✅ **Selesai (kode)** — menunggu aksi sekali-jalan di server | `0_baseline` dibuat & diuji; 5 skrip deploy memakai `migrate deploy` |
| 2 | Backup–restore teruji | ✅ **Selesai (tooling)** — drill di server masih perlu dijalankan | `scripts/verify-backup.{ps1,sh}` lulus 5 skenario uji |
| 3 | Celah `RequireAuth` | ✅ **Selesai** | `admin/layout.tsx` fail-closed + validasi `exp` JWT |
| 4 | Race condition `checkIn()` | ✅ **Selesai** | advisory lock per-tamu di `checkIn`, `checkInOffline`, `syncBatchFromStation`; 8 tes konkurensi hijau |
| 5 | Rate limit berbasis `stationId` | ✅ **Selesai** | `StationThrottlerGuard` + batas per-endpoint; 6 tes throttling + mutation test |
| 6 | Test suite | ✅ **Selesai** | Backend **61 tes / 7 suite**, frontend **45 tes / 6 berkas** (Vitest + Testing Library); CI menjalankan semuanya |
| 7 | Pecah file monolitik | 🟡 **Berjalan** | **−1.665 baris** keluar dari 3 halaman: `checkin` 2.427→1.641 (−32%), `souvenir` 1.805→1.288 (−29%), `luckydraw` 1.038→655 (−37%). 24 komponen + 1 hook + 4 modul logika; **salinan scanner di souvenir dihapus** (dulu copy-paste). Setiap ekstraksi dikunci tes (100 tes frontend). Termasuk ekstraksi logika murni `findCachedGuests` + `localGuestToGuest` (lookup offline). Sisa: controller `checkin` yang terikat ~13 callback |
| 8 | Higiene dependensi | ✅ **Selesai** | `next-pwa` dihapus, `@types/react` 18, Prettier + EditorConfig, **ESLint kedua app (0 error)**, 5 artefak scratch dihapus, template env ter-commit, [`docs/README.md`](README.md) |
| 9 | Observability | 🟡 **Sebagian** | `X-Request-Id` + logging terstruktur ([middleware](../apps/backend/src/common/logger/request-logging.middleware.ts)), metrik operasional `GET /api/ops/metrics` ([7 tes](../apps/backend/src/ops/ops.service.spec.ts)), [`RUNBOOK.md`](RUNBOOK.md) 9 prosedur. Error tracking eksternal (Sentry) belum — butuh DSN |

### ⚠️ Aksi manual yang masih diperlukan di server produksi

1. **Jalankan drill backup** pada data nyata:
   `bash scripts/backup` → lalu `bash scripts/verify-backup.sh backups/db_backup_*.sql`
2. **Baseline database produksi satu kali** — lihat [`docs/MIGRASI_DATABASE.md`](MIGRASI_DATABASE.md):
   ```bash
   bash scripts/baseline-db.sh          # cek
   bash scripts/baseline-db.sh --apply  # terapkan
   ```
   Tanpa ini, `update.sh` berikutnya akan berhenti dengan pesan yang mengarahkan ke langkah ini
   (sengaja fail-closed, bukan merusak data).



---

# 🔴 P0-1 — Sinkronisasi Skema Database & Hentikan `db push --accept-data-loss`

### Bukti

| Lokasi | Isi |
|---|---|
| [`prisma/migrations/`](../apps/backend/prisma/migrations) | Berhenti di `20251205000000_add_event_time` (10 migrasi) |
| Migrasi terakhir | Hanya membuat `GuestCheckin`, `EmailSettings`, `EmailLog` |
| [`schema.prisma`](../apps/backend/prisma/schema.prisma) | 28 model — termasuk `CheckinStation`, `Tournament*`, `LandingPage*`, `PublicRegistrationConfig` yang **tidak punya migrasi sama sekali** |
| [`docker-compose.prod.yml:40`](../docker-compose.prod.yml#L40) | `npx prisma db push` |
| [`deploy-prod.sh:222`](../deploy-prod.sh#L222) | `prisma db push --accept-data-loss` |
| [`deploy-prod.bat:255`](../deploy-prod.bat#L255) | idem |
| [`update.sh:168`](../update.sh#L168) | idem |
| [`update.bat:174`](../update.bat#L174) | idem |

### Dampak

`db push` menyamakan DB dengan schema **tanpa riwayat dan tanpa rollback**. Flag `--accept-data-loss` berarti: jika suatu saat sebuah kolom hilang/berubah tipe di `schema.prisma`, Prisma akan **menghapus kolom itu beserta datanya tanpa bertanya**. Tidak ada bukti audit kapan perubahan terjadi. `prisma migrate deploy` (yang terdaftar di `package.json`) tidak akan pernah bisa dipakai karena riwayat migrasi sudah tidak merepresentasikan DB sebenarnya.

### Langkah

**Fase A — Amankan (hari ke-1, ±2 jam)**

1. Ambil backup penuh dan **uji restore ke container sementara**:
   ```bash
   # di server produksi
   ./backup-docker.bat            # atau backup-docker sesuai OS
   # verifikasi isi dump
   docker compose -f docker-compose.prod.yml exec -T postgres \
     pg_dump -U postgres -d guest_registry --schema-only > /tmp/schema_prod.sql
   ```
2. Catat jumlah baris tabel kunci sebagai baseline:
   ```sql
   SELECT 'Guest' t, count(*) FROM "Guest"
   UNION ALL SELECT 'GuestCheckin', count(*) FROM "GuestCheckin"
   UNION ALL SELECT 'Event', count(*) FROM "Event";
   ```

**Fase B — Baseline migrasi (hari ke-1, ±3 jam)**

3. Pindahkan riwayat lama ke arsip (jangan dihapus):
   ```bash
   cd apps/backend/prisma
   mkdir -p _migrations_legacy_20251205
   mv migrations/2025* _migrations_legacy_20251205/
   ```
   > ⚠️ Pindahkan seluruh folder migrasi lama ke luar `prisma/`, sisakan `migration_lock.toml`.

4. Buat satu migrasi baseline dari schema saat ini:
   ```bash
   npx prisma migrate diff \
     --from-empty \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/0_baseline/migration.sql
   ```

5. **Uji dulu di database kosong** — pastikan baseline bisa membangun skema dari nol:
   ```bash
   docker run --rm -d --name pgtest -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:14-alpine
   DATABASE_URL="postgresql://postgres:test@localhost:55432/test" npx prisma migrate deploy
   DATABASE_URL="..." npx prisma db pull --print   # bandingkan, harus kosong
   docker rm -f pgtest
   ```

6. Tandai baseline sebagai "sudah diterapkan" di database produksi (tanpa menjalankan SQL-nya):
   ```bash
   cd apps/backend
   DATABASE_URL="<prod>" npx prisma migrate resolve --applied 0_baseline
   ```

7. Verifikasi tidak ada drift:
   ```bash
   npx prisma migrate status
   npx prisma migrate diff \
     --from-migrations prisma/migrations \
     --to-schema-datamodel prisma/schema.prisma \
     --exit-code        # harus exit 0
   ```

**Fase C — Ubah jalur deploy (hari ke-1, ±1 jam)**

8. Ganti semua `db push` di skrip menjadi `migrate deploy`:

   | File | Baris | Sebelum | Sesudah |
   |---|---|---|---|
   | [`docker-compose.prod.yml`](../docker-compose.prod.yml#L40) | 40 | `prisma db push` | `prisma migrate deploy` |
   | [`deploy-prod.sh`](../deploy-prod.sh#L222) | 222 | `prisma db push --accept-data-loss` | `prisma migrate deploy` |
   | [`deploy-prod.bat`](../deploy-prod.bat#L255) | 255 | idem | idem |
   | [`update.sh`](../update.sh#L168) | 168 | idem | idem |
   | [`update.bat`](../update.bat#L174) | 174 | idem | idem |
   | [`docker-compose.dev-https.yml`](../docker-compose.dev-https.yml#L26) | 26 | `db push --accept-data-loss` | `db push` (boleh, dev) |

9. Tambahkan guard di skrip deploy: **gagal keras** jika ada migrasi tertunda yang belum ditinjau.
   ```bash
   # sebelum start backend
   npx prisma migrate status || { echo "Migrasi tertunda — deploy dibatalkan"; exit 1; }
   ```

10. Simpan backup otomatis sebelum setiap deploy:
    ```bash
    # sisipkan di awal update.sh / update.bat, sebelum langkah migrasi
    docker compose -f docker-compose.prod.yml exec -T postgres \
      pg_dump -U "$DB_USER" -d "$DB_NAME" > "backup_predeploy_$(date +%Y%m%d_%H%M%S).sql"
    ```

### Verifikasi
- [ ] `prisma migrate status` → "Database schema is up to date!"
- [ ] `prisma migrate diff ... --exit-code` → exit 0
- [ ] Jumlah baris `Guest`, `GuestCheckin`, `Event` **identik** dengan baseline Fase A
- [ ] Aplikasi boot normal; login, check-in, souvenir, turnamen berfungsi
- [ ] Backup pra-deploy terbentuk

### Rollback
Jika baseline bermasalah: kembalikan `prisma/migrations/` dari `_migrations_legacy_*`, hapus tabel `_prisma_migrations`, restore dump Fase A. Database tidak berubah selama Fase B (hanya insert baris di `_prisma_migrations`).

---

# 🔴 P0-2 — Uji & Otomatiskan Backup–Restore

### Bukti
[`backup-docker.bat`](../backup-docker.bat), [`restore-docker.bat`](../restore-docker.bat), [`docker-compose.restore.yml`](../docker-compose.restore.yml) ada, tetapi tidak ada bukti pernah diuji; `docs/` tidak memuat prosedur drill.

### Langkah
1. Jalankan `backup-docker.bat`, lalu **restore ke stack terpisah** (`docker-compose.restore.yml` dengan port berbeda). Jangan pernah menimpa produksi saat drill.
2. Catat hasilnya sebagai checklist di [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) / [`docs/DOCKER_DEPLOY.md`](DOCKER_DEPLOY.md).
3. Tambahkan skrip `scripts/verify-backup.ps1` / `.sh` yang: restore ke container sementara → bandingkan `count(*)` tabel kunci → cetak PASS/FAIL.
4. Jadwalkan drill tiap 1 bulan (kalender tim) dan sebelum event besar.

### Verifikasi
- [ ] Restore ke stack bersih berhasil, aplikasi login normal
- [ ] Jumlah baris & file uploads (`backend_uploads` volume) cocok
- [ ] Waktu restore tercatat (target RTO < 30 menit)

---

# 🟠 P1-3 — Tutup Celah `RequireAuth` pada Halaman Admin

### Bukti
14 halaman **sudah** memakai `RequireAuth`, tetapi 6 halaman admin **tidak**:

| Halaman | Status |
|---|---|
| [`admin/system/page.tsx`](../apps/frontend/app/(main)/admin/system/page.tsx) | ❌ tanpa guard |
| [`admin/settings/email/page.tsx`](../apps/frontend/app/(main)/admin/settings/email/page.tsx) | ❌ tanpa guard |
| [`admin/tournaments/page.tsx`](../apps/frontend/app/(main)/admin/tournaments/page.tsx) | ❌ tanpa guard |
| [`admin/tournaments/new/page.tsx`](../apps/frontend/app/(main)/admin/tournaments/new/page.tsx) | ❌ tanpa guard |
| [`admin/tournaments/[id]/page.tsx`](../apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx) | ❌ tanpa guard |
| [`admin/tournaments/[id]/edit/page.tsx`](../apps/frontend/app/(main)/admin/tournaments/[id]/edit/page.tsx) | ❌ tanpa guard |

Endpoint backend tetap terlindungi `JwtAuthGuard`, jadi ini **bukan kebocoran data**, melainkan: UI ter-render untuk pengunjung tanpa login, error 401 mentah muncul, dan form tampil sebelum redirect.

### Langkah

**Opsi A — cepat & minim risiko (rekomendasi):**
1. Buat [`apps/frontend/app/(main)/admin/(protected)/layout.tsx`](../apps/frontend/app/(main)/admin) yang membungkus `RequireAuth`.
2. Pindahkan semua folder admin **kecuali `login`** ke dalam `(protected)/`.
3. Hapus pembungkus `RequireAuth` per-halaman (14 file) agar tidak dobel.

**Opsi B — seragam tanpa memindah folder:**
Bungkus 6 halaman tersisa dengan `RequireAuth` mengikuti pola [`admin/dashboard/page.tsx`](../apps/frontend/app/(main)/admin/dashboard/page.tsx#L173).

**Tambahan (disarankan):**
4. Simpan token juga sebagai cookie (non-httpOnly agar konsisten dengan SSE) dan lakukan redirect di [`middleware.ts`](../apps/frontend/middleware.ts) → hilangkan flash konten.
5. Perbaiki [`RequireAuth.tsx`](../apps/frontend/components/RequireAuth.tsx): saat ini hanya cek keberadaan token, tidak memvalidasi masa berlaku. Decode JWT `exp` di klien dan redirect jika kedaluwarsa.

### Verifikasi
- [ ] Buka `/admin/system` tanpa token → redirect `/admin/login`, tanpa sempat melihat isi halaman
- [ ] Token kedaluwarsa → redirect otomatis
- [ ] Semua 20 halaman admin tetap berfungsi setelah login

---

# 🟠 P1-4 — Perbaiki Race Condition `checkIn()`

### Bukti
[`guests.service.ts:363-493`](../apps/backend/src/guests/guests.service.ts#L363-L493) — pola **read-check-write**:

```
findUnique(guest + checkins)  →  validasi di memori  →  $transaction(create + update)
```

Tidak ada penguncian di antara ketiga langkah. Dua station yang check-in tamu yang sama pada milidetik yang sama dapat **sama-sama lolos validasi**.

### Langkah

1. **Tambah unique index** pada `GuestCheckin` untuk mode per-counter:
   ```prisma
   // schema.prisma — model GuestCheckin
   @@unique([guestId, checkinById])
   ```
   Postgres mengizinkan banyak `NULL` pada kolom unik, sehingga mode tanpa admin (kiosk publik) tetap berjalan. Buat migrasi baru via `prisma migrate dev --name add_checkin_unique_guard`.

2. **Ubah ke compare-and-set (CAS)** untuk mode single check-in:
   ```ts
   const claimed = await tx.guest.updateMany({
     where: { id, checkedIn: false },        // ← kondisi atomik
     data: { checkedIn: true, checkedInAt: now, checkinCount: 1, ... },
   });
   if (claimed.count === 0) {
     // kalah balapan → baca ulang, lempar ConflictException seperti biasa
   }
   ```

3. **Bungkus transaksi dengan isolation `Serializable`** + retry maksimal 3× untuk mode `maxCheckinCount`:
   ```ts
   await this.prisma.$transaction(async (tx) => { ... },
     { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 5000 });
   ```
   Tangani `P2034` (write conflict) dengan retry.

4. **Terapkan pola yang sama** pada [`checkInOffline()`](../apps/backend/src/guests/guests.service.ts#L667) dan `syncBatchFromStation()` — saat ini keduanya membaca `checkins` di awal batch lalu menulis, sehingga dua station offline yang sync bersamaan bisa menghasilkan dua baris valid.

5. **Tambah uji konkurensi** (lihat P2-6): 50 request paralel ke tamu yang sama → tepat 1 sukses, 49 mendapat `409`.

### Verifikasi
- [ ] Uji beban: 20 request paralel, 1 tamu, mode single → 1 sukses
- [ ] Mode per-counter: 20 request dari 5 admin berbeda → 5 sukses (1 per admin)
- [ ] Mode offline batch: 2 station sync bersamaan → tidak ada duplikat `success: true`
- [ ] Tidak ada `P2034` yang lolos ke pengguna tanpa retry

### Rollback
Unique index bisa dihapus tanpa kehilangan data. Perubahan transaksi murni logika — revert commit sudah cukup.

---

# 🟠 P1-5 — Rate Limit Publik Berbasis `stationId`

### Bukti
[`public.controller.ts:12`](../apps/backend/src/public/public.controller.ts#L12):

```ts
@SkipThrottle({ default: true, short: true, medium: true, long: true })
@Controller('public')
```

Seluruh controller — termasuk `guests/search`, `checkin`, `checkin-qr`, `sync-batch`, `health` — **tanpa rate limit**. Di [`souvenirs.controller.ts:60,72`](../apps/backend/src/souvenirs/souvenirs.controller.ts#L60) juga di-skip untuk mode scanner cepat.

### Dampak & Jebakan
Mengaktifkan throttler berbasis IP begitu saja akan **mematikan kiosk**: 20 station di venue yang sama keluar melalui satu IP publik (NAT) → saling memblokir. Ini justru lebih berbahaya daripada tidak ada limit.

### Langkah
1. Buat `StationThrottlerGuard` yang mengambil tracker key:
   ```ts
   // stationId dari body/header X-Station-Id, fallback ke IP
   getTracker(req) { return req.body?.stationId || req.headers['x-station-id'] || req.ip; }
   ```
2. Konfigurasi bertingkat di [`throttler.config.ts`](../apps/backend/src/common/throttler/throttler.config.ts):

   | Endpoint | Limit | Key |
   |---|---|---|
   | `POST /public/guests/sync-batch` | 60/menit | `stationId` |
   | `POST /public/guests/checkin*` | 120/menit | `stationId` |
   | `GET /public/guests/search` | 60/menit | `stationId` |
   | `GET /public/health` | 120/menit | IP (sudah di-cache 5 detik) |
   | `POST /souvenirs/give*` | 120/menit | `stationId` |

3. Pastikan `app.set('trust proxy', 1)` di [`main.ts`](../apps/backend/src/main.ts) — saat ini belum ada, sehingga `req.ip` di belakang Nginx akan selalu IP proxy.
4. Kirim header `X-Station-Id` dari frontend ([`stationId` sudah tersimpan](apps/frontend/lib/indexeddb.ts#L33) di `StationConfig`).
5. Uji dengan 20 station virtual, **bukan** 1 klien.

### Verifikasi
- [ ] Simulasi 20 station × 25 checkin serentak → 0 respons `429`
- [ ] Simulasi flood 1 IP tanpa `stationId` → `429` sesuai limit
- [ ] `req.ip` menampilkan IP klien sebenarnya, bukan IP container proxy

### Rollback
`ThrottlerGuard` global tetap ada; cukup naikkan limit atau kembalikan `@SkipThrottle` pada controller jika insiden saat event.

---

### Catatan implementasi (selesai)

Yang berubah:

| Berkas | Perubahan |
|---|---|
| `src/common/throttler/station-throttler.guard.ts` | Kunci = `stationId` (body/header/query), fallback `req.ip` |
| `src/common/throttler/throttler.limits.ts` | Batas per jenis endpoint (kiosk, health, stream, submit) |
| `src/common/throttler/throttler.config.ts` | Batas global naik ke 20/s, 150/10s, 1200/menit |
| `src/app.module.ts` | `ThrottlerGuard` → `StationThrottlerGuard` |
| `src/main.ts` | `trust proxy = 1` agar `req.ip` benar di belakang NPM |
| `src/public/public.controller.ts` | Hapus `@SkipThrottle` kelas; override untuk health & stream |
| `src/public-registration/public-registration.controller.ts` | Hapus `@SkipThrottle`; submit dibatasi ketat (20/menit) |
| `lib/station-fetch.ts` + `components/ClientBootstrap.tsx` | Interceptor fetch menyisipkan `X-Station-Id` otomatis |

**Angka penting:** polling health tiap 2 detik × 20 station = 600 permintaan/menit
dari satu IP. Batas lama (200/menit) akan melumpuhkan kiosk — karena itu health
mendapat batas 4000/menit dan kiosk 2400/menit.

**Celah yang ditutup saat implementasi:** versi awal guard membaca header
`X-Forwarded-For` secara manual, yang memungkinkan klien memalsukan IP untuk
mendapat kuota baru. Kini hanya `req.ip` yang dipakai (sudah menghormati
`trust proxy`).

---
# 🟡 P2-6 — Bangun Test Suite

### Bukti
`package.json` backend maupun frontend **tidak punya script `test`**. Folder [`__tests__/landing`](../apps/frontend/__tests__) kosong. File `*.check.ts` di [`lib/`](../apps/frontend/lib) hanya skrip manual. `version.json` sendiri mencatat `"automated": "TBD"`.

### Langkah

**Backend (Jest + Supertest) — prioritas 1**
1. Tambah `jest`, `ts-jest`, `@testcontainers/postgresql` + script `test`, `test:e2e`.
2. Target cakupan minimum, berurutan:
   - `GuestsService.checkIn` — 3 mode (single, multi, per-counter) + batas `maxCheckinCount`
   - `syncBatchFromStation` — idempotency, konflik, `remoteUpdates`
   - `PrizesService.drawWinners` — kuota, duplikat, `allowMultipleWins`
   - `bracket-engine` — seeding, BYE auto-advance, propagasi `nextMatchId`
   - `PublicRegistrationService` — kuota, jendela waktu, anti-duplikat

**Frontend**
3. `vitest` + `@testing-library/react` untuk hook murni hasil refactor P2-7 (`useCheckinQueue`).
4. `@playwright/test` untuk 5 alur kritis:
   - login → dashboard
   - checkin manual → popup sukses
   - checkin QR → popup duplikat
   - souvenir give → stok berkurang
   - **offline:** matikan jaringan → checkin → nyalakan → antrean tersinkron

**CI**
5. `.github/workflows/ci.yml`: `lint → typecheck → unit → e2e (docker compose)`. Wajib hijau sebelum merge.

### Target
- Cakupan service inti ≥ 70%
- 5 e2e hijau
- Waktu CI < 10 menit

---

# 🟡 P2-7 — Pecah File Monolitik

### Bukti

| File | Ukuran | Baris |
|---|---|---|
| [`app/(main)/checkin/page.tsx`](../apps/frontend/app/(main)/checkin/page.tsx) | 100 KB | 2.427 |
| [`app/(main)/souvenir/page.tsx`](../apps/frontend/app/(main)/souvenir/page.tsx) | 93 KB | — |
| [`app/(main)/luckydraw/page.tsx`](../apps/frontend/app/(main)/luckydraw/page.tsx) | 51 KB | — |
| [`app/(main)/admin/settings/event/page.tsx`](../apps/frontend/app/(main)/admin/settings/event/page.tsx) | 46 KB | — |
| [`app/(main)/admin/guests/page.tsx`](../apps/frontend/app/(main)/admin/guests/page.tsx) | 45 KB | 1.086 |

### Langkah — pola *strangler*, bukan rewrite

**Prasyarat: kerjakan setelah P2-6 punya minimal 1 e2e alur check-in.**

Untuk `checkin/page.tsx`, ekstrak berurutan (satu PR per langkah, perilaku identik):

1. `hooks/useCheckinQueue.ts` — `rapidQueueRef`, `isProcessingQueueRef`, `rapidLogs`, `appendLog`
2. `hooks/useStationConfig.ts` — inisialisasi station, offline sync, `handleDownloadGuests`, `handleClearCache`
3. `lib/checkin-api.ts` — semua `fetch` ke `/public/guests/*`
4. `components/checkin/SearchPanel.tsx`, `ScanPanel.tsx`, `ResultPopup.tsx`, `ScanLog.tsx`, `OfflineBanner.tsx`

Target akhir: setiap file < 400 baris. Aturan: **jangan mengubah perilaku, perilaku, atau styling** dalam PR ekstraksi.

---

# 🟢 P3-8 — Higiene Dependensi & Pembersihan Repo

### Bukti & Langkah

| Temuan | Tindakan |
|---|---|
| `next-pwa@^5.6.0` di [`package.json:29`](../apps/frontend/package.json#L29) tidak pernah di-import (hanya `@ducanh2912/next-pwa` yang dipakai) | `npm uninstall next-pwa` |
| `@types/react@19.2.4` sedangkan `react@18.3.1` | Turunkan ke `@types/react@^18`, atau upgrade React ke 19 secara terpisah & sadar |
| File sisa di root: `CUsersIT10AppDataLocalTempdetect_output.json`, `_detect_output.json`, `test-shadow.html`, `diff.txt`, `Import Tamu Fix.xlsx` | Pindahkan ke `_archive/` atau hapus |
| `.env.production.example` ikut ter-ignore `.env.*` sehingga tidak ter-commit | `git add -f .env.production.example` agar template tersedia |
| `docs/` berisi 20+ dokumen dengan tumpang tindih ([`IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md), [`DOCUMENTATION.md`](../DOCUMENTATION.md), `docs/superpowers/*`) | Buat `docs/README.md` sebagai indeks; arsipkan yang usang ke `docs/_archive/` |
| Tidak ada ESLint/Prettier terpasang | Tambah `eslint` + `prettier` + script `lint`, `format` |

---

# 🟢 P3-9 — Observability & Dokumentasi Operasional

1. **Error tracking** — Sentry (atau alternatif) di frontend & backend. Saat ini error hanya di console.
2. **Log terstruktur** — `winston` sudah terpasang ([`common/logger`](../apps/backend/src/common/logger)); pastikan `requestId` ikut di setiap log agar bisa korelasi satu scan ke satu baris log.
3. **Metrik operasional saat event** — panel ringkas: jumlah station aktif, ukuran antrean offline, konflik sync per jam, latensi sync. Data sudah tersedia di `CheckinStation` & `GuestCheckin.isDuplicate`.
4. **Runbook insiden** — `docs/RUNBOOK.md`: apa yang dilakukan jika (a) DB penuh, (b) SSE mati, (c) antrean offline menumpuk, (d) laptop station rusak/hilang.
5. **Alert** — healthcheck Docker sudah ada; tambahkan alert eksternal (Uptime Kuma / healthchecks.io) ke `/api/health` dan `/api/public/health`.

---

## Definition of Done (per item)

- [ ] PR dengan deskripsi: masalah → solusi → bukti verifikasi (screenshot/log)
- [ ] Lulus `lint`, `typecheck`, `test` (setelah P2-6 ada)
- [ ] Diuji di environment staging dengan data mirip produksi
- [ ] Ada catatan rollback di deskripsi PR
- [ ] Dokumentasi terkait diperbarui (`docs/`)
- [ ] `graphify update .` dijalankan agar knowledge graph tetap akurat

---

## Yang **tidak** termasuk rencana ini

Sengaja **tidak** saya masukkan agar fokus: migrasi state management (React Query → Zustand dsb.), ganti Tailwind v3 → v4, Next.js 15 → 16, atau rewrite UI. Semua itu berisiko tinggi dan tidak menjawab masalah operasional nyata aplikasi ini.
