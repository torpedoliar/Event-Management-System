# Runbook Insiden — Event Management System

> Untuk operator dan teknisi yang menangani masalah **saat event berlangsung**.
> Prinsip utama: **jangan menghentikan seluruh sistem untuk memperbaiki satu
> masalah**. Kiosk punya mode offline — manfaatkan itu.

---

## 0. Tiga hal yang harus dicek lebih dulu

```bash
# 1. Apakah container hidup?
docker ps --filter "name=guest" --format "table {{.Names}}\t{{.Status}}"

# 2. Apakah API sehat?
curl -s http://localhost:4000/api/health

# 3. Apa kata log 15 menit terakhir?
docker exec guest-backend-prod sh -c "tail -n 100 logs/error-$(date +%F).log"
```

Setiap respons memiliki header **`X-Request-Id`**. Jika operator melaporkan
kegagalan spesifik, minta ID tersebut dan cari di log:

```bash
grep "ID-YANG-DILAPORKAN" logs/app-*.log
```

### Metrik operasional (butuh login admin)

```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:4000/api/ops/metrics
```

Contoh keluaran:

```json
{
  "activeEvent": { "id": "...", "name": "Gathering 2026" },
  "guests": { "total": 480, "checkedIn": 312, "notCheckedIn": 168, "attendanceRate": 65 },
  "checkins": { "total": 318, "last24h": 296, "offline": 41, "duplicate": 6 },
  "stations": { "total": 12, "active": 12, "lastSyncAt": "...", "stale": 1 }
}
```

Cara membacanya saat event:

| Angka | Arti | Tindakan bila mencurigakan |
|---|---|---|
| `stations.stale > 0` | Ada station belum sinkron > 30 menit | Cek perangkat itu; lihat bagian 2 |
| `checkins.duplicate` naik cepat | Banyak percobaan check-in ganda | Cek mode check-in event; lihat bagian 5 |
| `checkins.offline` tinggi | Banyak check-in dari mode offline | Pastikan sinkronisasi berjalan |
| `guests.attendanceRate` jauh di bawah perkiraan | Tamu belum datang / masalah kiosk | Cek station & jaringan |

---

## 1. Display tidak menampilkan tamu yang baru check-in (SSE mati)

**Gejala:** kiosk berhasil check-in, layar `/show` tidak berubah.

**Penyebab umum:** koneksi SSE terputus (proxy restart, jaringan).

**Tindakan:**
1. Di komputer display, **refresh halaman** (`F5`). Ini membuka ulang SSE.
2. Jika berulang, periksa proxy: SSE butuh `proxy_buffering off` dan timeout panjang.
3. Pastikan token login display masih berlaku — SSE menolak tanpa JWT yang sah (401).
4. Cek di DevTools → Network → `stream`: status harus `200` dan tipe
   `text/event-stream`, bukan `401`.

> Check-in **tetap tercatat** di database meski display mati. Data tidak hilang;
> hanya tampilannya tertinggal.

---

## 2. Antrean offline menumpuk

**Gejala:** indikator koneksi menampilkan jumlah antrean naik terus.

**Tindakan:**
1. Pastikan perangkat benar-benar terhubung internet (bukan hanya Wi-Fi lokal).
2. Buka panel antrean di halaman kiosk, cek pesan error per item.
3. Jangan menekan "Hapus antrean" — **itu membuang data check-in**.
4. Jika antrean > 80% batas, sebar tamu ke station lain yang online.
5. Setelah koneksi pulih, sinkronisasi berjalan otomatis. Pantau sampai habis.

**Bila perangkat akan dimatikan dengan antrean tersisa:** sambungkan ke internet
lebih dulu dan tunggu antrean kosong. Data hanya ada di IndexedDB perangkat itu.

---

## 3. Database penuh / koneksi habis

**Gejala:** API melambat lalu `500`, log berisi `too many connections` atau
`could not extend file`.

**Tindakan segera:**
```bash
# Cek koneksi aktif
docker exec guest-db-prod psql -U postgres -d guest_registry -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Cek ukuran database & disk
docker exec guest-db-prod psql -U postgres -d guest_registry -c \
  "SELECT pg_size_pretty(pg_database_size('guest_registry'));"
df -h
```

- Jika jumlah koneksi mendekati batas: restart backend
  (`docker restart guest-backend-prod`). Ini melepas koneksi yang menggantung.
- Jika disk penuh: hapus log lama (`logs/`) dan backup lama, **bukan** uploads.
- **Jangan** menjalankan `prisma migrate` atau `db push` saat event berlangsung.

---

## 4. Satu laptop station rusak atau hilang

**Tindakan:**
1. Perangkat lain buka `/checkin` dan login — station baru terdaftar otomatis
   saat check-in pertama.
2. **Jika perangkat hilang dan masih ada antrean offline di dalamnya:** data itu
   tidak bisa diambil kembali. Catat tamu yang mungkin terlewat, lalu
   check-in manual dari station lain setelah acara.
3. Perangkat yang hilang sebaiknya **dinonaktifkan tokennya** (ganti kredensial
   admin bila perlu).

---

## 5. Tamu tercatat check-in berkali-kali

**Gejala:** `checkinCount` tamu > 1 padahal seharusnya sekali.

**Penyebab:** mode check-in memang mengizinkan multiple, **atau** data lama dari
sebelum perbaikan race condition (versi < P1-4).

**Tindakan:**
1. Periksa pengaturan event: `allowMultipleCheckin`, `maxCheckinCount`,
   `allowMultipleCheckinPerCounter`.
2. Jika pengaturan sudah benar tetapi tetap berulang, periksa versi backend —
   perbaikan race condition ada sejak perbaikan P1-4.

---

## 6. Deploy/update gagal di tengah acara

**Tindakan:** **kembalikan ke versi sebelumnya**, jangan memperbaiki di tempat.

```bash
git log --oneline -5          # tentukan commit terakhir yang stabil
git checkout <commit-stabil>
bash deploy-prod.sh
```

Database: migrasi yang sudah terlanjur jalan **tidak** dibatalkan otomatis.
Pulihkan dari backup pra-deploy bila perlu:

```bash
bash scripts/verify-backup.sh backup_pre_deploy_*.sql   # pastikan backup sehat DULU
```

> Itulah alasan setiap deploy kini membuat backup wajib dan memverifikasinya.
> Backup yang belum pernah diuji restore bukan backup.

---

## 7. Rollback total (kembali ke backup database)

```bash
# 1. Verifikasi backup layak dipakai
bash scripts/verify-backup.sh backups/db_backup_YYYYMMDD_HHMMSS.sql

# 2. Hentikan backend agar tidak ada penulisan baru
docker stop guest-backend-prod

# 3. Restore
docker exec -i guest-db-prod psql -U postgres -d guest_registry < backups/db_backup_YYYYMMDD_HHMMSS.sql

# 4. Nyalakan kembali
docker start guest-backend-prod
```

> Restore menimpa seluruh database. Semua check-in setelah waktu backup akan hilang.

---

## 8. Alert yang sebaiknya dipasang

Sistem sudah punya `GET /api/health` dan `GET /api/public/health`. Pasang
pemantau eksternal (Uptime Kuma, healthchecks.io, atau sejenisnya):

| Yang dipantau | Interval | Ambang |
|---|---|---|
| `GET /api/health` | 1 menit | 2 kegagalan berturut-turut |
| `GET /api/public/health` | 5 menit | 3 kegagalan berturut-turut |
| Ruang disk | 15 menit | < 15% |
| Ukuran antrean offline per station | saat event | > 80% batas |

---

## 9. Kontak & eskalasi

| Peran | Tanggung jawab |
|---|---|
| Operator station | Menjalankan check-in, melapor bila UI error |
| Teknisi on-site | Restart container, ganti perangkat, cek jaringan |
| Developer | Insiden data (duplikat, hilang), rollback, perbaikan kode |

**Saat melapor, sertakan:** waktu kejadian, halaman, `X-Request-Id` dari
DevTools, dan tangkapan layar. Tanpa tiga hal itu, penelusuran di log akan lambat.
