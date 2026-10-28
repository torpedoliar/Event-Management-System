# Indeks Dokumentasi

> **Mulai dari sini.** Repo ini punya banyak dokumen dari berbagai fase
> pengembangan. Tabel di bawah menandai mana yang **masih berlaku** dan mana
> yang **historis** (disimpan sebagai catatan, jangan dijadikan acuan).

Terakhir diperbarui: 2026-10-27

---

## 1. Wajib dibaca sebelum menyentuh produksi

| Dokumen | Isi |
|---|---|
| [`RENCANA_PERBAIKAN.md`](RENCANA_PERBAIKAN.md) | Status perbaikan, prioritas, dan langkah manual yang tersisa |
| [`MIGRASI_DATABASE.md`](MIGRASI_DATABASE.md) | Alur migrasi Prisma, baseline sekali jalan, rollback |
| [`TESTING.md`](TESTING.md) | Menjalankan tes, mutation test, cakupan saat ini |
| [`RUNBOOK.md`](RUNBOOK.md) | Prosedur insiden saat event berlangsung |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Deploy manual (tanpa Docker) |
| [`DOCKER_DEPLOY.md`](DOCKER_DEPLOY.md) | Deploy dengan Docker Compose |

Skrip terkait di [`../scripts/`](../scripts):

- `baseline-db.sh` — penandaan migrasi baseline (sekali jalan)
- `verify-backup.sh` / `verify-backup.ps1` — drill restore backup
- `test-db.sh` — database uji terisolasi

---

## 2. Arsitektur & referensi teknis

| Dokumen | Isi | Catatan |
|---|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Ringkasan arsitektur & aliran data | Ringkas, masih akurat |
| [`API.md`](API.md) | Referensi endpoint REST | Sebagian perlu diperbarui (modul turnamen belum tercakup) |
| [`DB_SCHEMA.md`](DB_SCHEMA.md) | Skema database | Sangat singkat; sumber kebenaran tetap [`schema.prisma`](../apps/backend/prisma/schema.prisma) |
| [`STRUCTURE.md`](STRUCTURE.md) | Struktur folder proyek | |
| [`TECHNICAL_BLUEPRINT.md`](TECHNICAL_BLUEPRINT.md) | Blueprint teknis mendalam (81 KB) | Paling lengkap; sebagian berisi rencana awal |
| [`server-specification.md`](server-specification.md) | Spesifikasi kebutuhan server | |

### Catatan per modul

| Dokumen | Modul |
|---|---|
| [`MODULE_NOTES_AUTH.md`](MODULE_NOTES_AUTH.md) | Autentikasi |
| [`MODULE_NOTES_GUESTS.md`](MODULE_NOTES_GUESTS.md) | Manajemen tamu |
| [`MODULE_NOTES_EVENTS.md`](MODULE_NOTES_EVENTS.md) | Event & branding |
| [`MODULE_NOTES_DISPLAY.md`](MODULE_NOTES_DISPLAY.md) | Halaman display `/show` |

---

## 3. Fitur spesifik

| Dokumen | Isi |
|---|---|
| [`MULTI_STATION_OFFLINE_IMPLEMENTATION.md`](MULTI_STATION_OFFLINE_IMPLEMENTATION.md) | Desain mode offline multi-station (17 KB) |
| [`HOW_TO_START.md`](HOW_TO_START.md) | Menjalankan aplikasi di lokal |
| [`url.md`](url.md) | Daftar URL halaman |
| [`WORKFLOW.md`](WORKFLOW.md) | Alur kerja aplikasi |

---

## 4. Historis / arsip

Jangan dijadikan acuan — dipertahankan untuk melacak keputusan masa lalu.

| Dokumen | Isi | Alasan diarsipkan |
|---|---|---|
| [`MEMORY.md`](MEMORY.md) | Ringkasan perubahan per versi | Digantikan [`../CHANGELOG.md`](../CHANGELOG.md) |
| [`REVIEW.md`](REVIEW.md) | Saran perbaikan (2025-11) | Sebagian besar sudah dikerjakan — lihat [`RENCANA_PERBAIKAN.md`](RENCANA_PERBAIKAN.md) |
| `FIXES_APPLIED.md` (root) | Perbaikan mode offline | Sudah selesai |
| `INTEGRATION_COMPLETE.md` | Catatan integrasi tooling "superpowers" | Perkakas pengembangan, bukan produk |
| `SUPERPOWERS_INTEGRATION_GUIDE.md` | Panduan tooling superpowers | Perkakas pengembangan |
| [`superpowers/`](superpowers) | Rencana & spesifikasi per fitur | Arsip perencanaan |

Dokumen perencanaan di `superpowers/plans/` berguna sebagai catatan **mengapa**
sebuah fitur dibangun dengan cara tertentu, tetapi jangan dipakai sebagai
dokumentasi kondisi saat ini.

---

## 5. Dokumen di root repo

| Dokumen | Isi |
|---|---|
| [`../README.md`](../README.md) | Gambaran produk, fitur, quick start |
| [`../USER_GUIDE.md`](../USER_GUIDE.md) | Panduan pemakaian untuk operator |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Riwayat versi |
| [`../DOCUMENTATION.md`](../DOCUMENTATION.md) | Dokumentasi lengkap (versi lama, cukup menyeluruh) |
| [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) | Rencana audit halaman turnamen |
| [`../PRODUCT.md`](../PRODUCT.md) | Definisi produk |
| [`../DESIGN.md`](../DESIGN.md) | Sistem desain (token, tipografi, komponen) |
| [`../CLAUDE.md`](../CLAUDE.md) / [`../QWEN.md`](../QWEN.md) | Konteks proyek untuk asisten AI |

---

## Menambahkan dokumen baru

1. Letakkan di `docs/` dan tambahkan barisnya ke tabel di atas.
2. Sebutkan dengan jelas apakah dokumen **berlaku** atau **historis**.
3. Jangan menduplikasi isi — tautkan ke sumber kebenaran (`schema.prisma`,
   `RENCANA_PERBAIKAN.md`, dan seterusnya).
