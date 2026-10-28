# Migrasi Database — Panduan Operasional

> Berlaku sejak perbaikan P0-1. Sebelumnya proyek ini **tidak memakai migrasi**:
> setiap deploy menjalankan `prisma db push --accept-data-loss` yang dapat
> menghapus kolom beserta datanya tanpa konfirmasi.

---

## 1. Kondisi Saat Ini

| Hal | Status |
|---|---|
| Folder [`apps/backend/prisma/migrations/`](../apps/backend/prisma/migrations) | Berisi **satu** migrasi: `0_baseline` |
| Migrasi lama (10 folder, s/d Des 2025) | Diarsipkan ke `apps/backend/prisma/_migrations_legacy_20251205/` |
| Perintah deploy | `prisma migrate deploy` |
| Perintah dev | `prisma migrate dev` |
| `db push` | Hanya untuk development lokal |

`0_baseline` dibuat dari `schema.prisma` **saat ini**: 28 tabel, 10 enum,
59 index, 35 foreign key. Migrasi ini merepresentasikan kondisi database
produksi apa adanya.

> Catatan: folder `_migrations_legacy_*` sengaja diletakkan **di luar**
> `prisma/migrations/` agar tidak dieksekusi, dan sudah dikecualikan dari
> Docker build context lewat `.dockerignore`. Folder ini **tetap di-commit**
> agar riwayat perubahan skema tidak hilang dari repo.

---

## 2. Tindakan Sekali Jalan di Database Produksi

Database produksi yang sudah ada **belum punya tabel `_prisma_migrations`**.
Jika `prisma migrate deploy` dijalankan begitu saja, ia akan mencoba membuat
ulang seluruh tabel dan gagal dengan `relation "Guest" already exists`.

Karena strukturnya memang **sudah sesuai** schema, yang benar adalah menandai
baseline sebagai "sudah diterapkan" — tanpa menjalankan SQL-nya.

### Langkah

```bash
# 1. Cek status (tidak mengubah apa pun)
bash scripts/baseline-db.sh

# 2. Jika muncul [AKSI DIPERLUKAN], terapkan penandaan baseline
bash scripts/baseline-db.sh --apply
```

Skrip ini akan:
1. Mendeteksi apakah database sudah berisi tabel aplikasi.
2. **Memeriksa drift** — memastikan struktur DB benar-benar sama dengan `schema.prisma`.
   Jika ada perbedaan, baseline **dibatalkan** (drift tidak boleh disembunyikan).
3. Menjalankan `prisma migrate resolve --applied 0_baseline`.
4. Menampilkan `prisma migrate status`.

> **Prasyarat:** container `guest-db-prod` harus berjalan, dan `.env.production` tersedia.

Setelah langkah ini, `update.sh` / `deploy-prod.sh` dapat dijalankan seperti biasa.

---

## 3. Alur Kerja Sehari-hari (Perubahan Schema)

**Jangan pernah** mengedit database langsung atau memakai `db push` di produksi.

```bash
cd apps/backend

# 1. Ubah prisma/schema.prisma

# 2. Buat migrasi (TIDAK langsung diterapkan)
npx prisma migrate dev --name tambah_kolom_apa

# 3. Tinjau SQL yang dihasilkan
cat prisma/migrations/*/migration.sql

# 4. Terapkan di lokal & jalankan pengujian
npx prisma migrate deploy

# 5. Commit schema + folder migrasi, lalu deploy
```

Saat deploy, `migrate deploy` menerapkan migrasi yang tertunda secara berurutan.
Jika satu migrasi gagal, deploy **berhenti** dan database tidak dihapus otomatis.

### Aturan penamaan
- Gunakan nama deskriptif: `tambah_index_checkin`, `ubah_tipe_skor`.
- Satu migrasi = satu perubahan logis.
- Migrasi yang sudah di-deploy **tidak boleh diedit** — buat migrasi baru.

---

## 4. Verifikasi

```bash
cd apps/backend

# Status: harus "Database schema is up to date!"
npx prisma migrate status

# Drift check: harus "No difference detected." (exit 0)
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL" \
  --exit-code
```

Di produksi, drift check yang lebih praktis:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm backend \
  npx prisma migrate status
```

---

## 5. Rollback

Prisma tidak menyediakan rollback otomatis. Rencana rollback yang benar:

1. **Restore dari backup** — inilah alasan setiap deploy kini membuat backup
   wajib dan memverifikasinya lebih dulu.
2. Atau buat migrasi baru yang membalikkan perubahan (`migrate dev --name revert_xxx`).

> Karena itu, urutan aman adalah: **backup → verifikasi backup → migrasi → deploy.**

Lihat [verifikasi backup](#6-verifikasi-backup) di bawah.

---

## 6. Verifikasi Backup

Backup yang belum pernah di-restore **bukan backup**.

```bash
# Linux / produksi
bash scripts/verify-backup.sh backup_pre_deploy_20261027_193000.sql

# Windows
powershell -NoProfile -File scripts\verify-backup.ps1 -DumpFile backup_pre_deploy_20261027_193000.sql
```

Skrip melakukan **drill restore sungguhan**:

1. Menyalakan container PostgreSQL sementara (data sekali pakai).
2. Memeriksa integritas struktural dump — mendeteksi file terpotong lewat
   penanda akhir `pg_dump` dan keseimbangan blok `COPY`.
3. Me-restore dengan `ON_ERROR_STOP=1`.
4. Membandingkan jumlah baris **setiap tabel** dengan database sumber.
5. Menghapus container sementara (selalu, termasuk saat gagal).

Exit code `0` = PASS, `1` = FAIL.

### Latihan drill (tanpa data produksi)

Tersedia fixture untuk berlatih di mesin lokal:

```bash
docker run -d --name guest-drill -e POSTGRES_PASSWORD=drillpass \
  -e POSTGRES_DB=guest_registry -p 55432:5432 postgres:14-alpine

DATABASE_URL="postgresql://postgres:drillpass@localhost:55432/guest_registry?schema=public" \
  npx prisma migrate deploy

docker cp scripts/drill-seed.sql guest-drill:/tmp/seed.sql
docker exec guest-drill psql -U postgres -d guest_registry -f /tmp/seed.sql

docker exec guest-drill pg_dump -U postgres -d guest_registry > drill.sql
bash scripts/verify-backup.sh drill.sql --source guest-drill
```

---

## 7. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `relation "Guest" already exists` | Database lama belum di-baseline | `bash scripts/baseline-db.sh --apply` |
| `P3009: migrate found failed migrations` | Migrasi pernah gagal di tengah | Tinjau `_prisma_migrations`, perbaiki manual, lalu `migrate resolve --rolled-back <nama>` |
| `No pending migrations` padahal schema berubah | Lupa membuat migrasi | `npx prisma migrate dev --name xxx` |
| Drift check gagal | DB diubah manual / `db push` terpakai | Buat migrasi perbaikan, **jangan** reset produksi |
| Migrasi tidak ditemukan di container | Folder tidak ikut image | Cek `.dockerignore`; `prisma/migrations/**` harus ikut |

---

## 8. Referensi

- Rencana perbaikan lengkap: [`docs/RENCANA_PERBAIKAN.md`](RENCANA_PERBAIKAN.md)
- Deploy produksi: [`deploy-prod.sh`](../deploy-prod.sh) / [`deploy-prod.bat`](../deploy-prod.bat)
- Update produksi: [`update.sh`](../update.sh) / [`update.bat`](../update.bat)
- Skrip baseline: [`scripts/baseline-db.sh`](../scripts/baseline-db.sh)
- Skrip verifikasi backup: [`scripts/verify-backup.sh`](../scripts/verify-backup.sh)
