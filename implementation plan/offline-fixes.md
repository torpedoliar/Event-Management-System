# Rencana Perbaikan Fitur Offline Check-in

Dokumen ini merangkum rencana implementasi teknis untuk mengatasi kelemahan (flaws) yang ditemukan pada sistem Offline Check-in multi-station.

## User Review Required
> [!IMPORTANT]
> - Langkah di bawah membutuhkan instalasi `next-pwa` agar sistem kebal terhadap *refresh browser* saat offline (PWA Offline First).
> - Tambahan fitur *fetch* massal diperlukan untuk menyimpan semua data tamu ke IndexedDB (`localGuests`) demi pencarian nama saat internet mati. 

---

## Proposed Changes

### 1. Offline & PWA Support

#### [MODIFY] `e:\Vibe\Registrasi Tamu\apps\frontend\package.json`
- Menambahkan *dependency* `next-pwa` untuk Service Worker otomatis.

#### [MODIFY] `e:\Vibe\Registrasi Tamu\apps\frontend\next.config.mjs`
- Membungkus *config* saat ini dengan `withPWA` agar aplikasi menghasilkan / memasang Service Worker yang melayani cache HTML dan struktur App Router Next.js, menutupi celah *dinosaur error* saat mati internet mendadak lalu direload.

---

### 2. Memperbaiki Bug `doSearch` dan Pencarian Lokal

#### [MODIFY] `e:\Vibe\Registrasi Tamu\apps\frontend\app\checkin\page.tsx`
- **Hapus Cache Lama Sebelum Mencari**: Tambahkan `setResults([])` di awal `doSearch` untuk memastikan array hasil pencarian lama terhapus dan tidak memicu input ke antrean offline secara salah sasaran.
- **Tombol Download Database Lokal**: Tambahkan tombol di menu *Settings* -> **"Download Tamu untuk Akses Offline"**. Sistem akan menggunakan `$fetch(apiBase()/guests?limit=10000)` dan memakai `indexedDBService.cacheGuest` secara massal untuk mengisi semua data cache ke penyimpanan *browser* perangkat masing-masing stasiun.
- **Ubah Logika Catch Offline Search**:
  Apabila *NetworkError* terjadi, program TIDAK akan menggunakan `results[0]` sisa. Sistem akan memanggil `indexedDBService.getAllCachedGuests()` dan menyaring nama/ID. Jika ketemu, maka diarahkan untuk offline check-in di stasiun lokal.

---

### 3. Peningkatan Feedback Admin

#### [MODIFY] `e:\Vibe\Registrasi Tamu\apps\frontend\components\ConnectionStatusIndicator.tsx`
- Tampilkan indikator spesifik: **"X tamu ditarik cache lokal"** di panel untuk menginformasikan admin di stasiun bahwa stasiunnya telah menyinkronkan daftar tamu untuk mode offline tanpa kendala.

---

## Open Questions

> [!WARNING]
> Sebelum eksekusi, mohon konfirmasi:
> 1. Apakah Anda setuju instalasi `next-pwa` di dalam direktori `apps/frontend`?
> 2. Untuk tarikan data `guests` offline secara lengkap, apakah target tarik 10.000 data tamu sudah cukup aman dengan *limit* pendaftaran acara saat ini?

## Verification Plan

### Automated Tests
- Menghapus riwayat *cache* lokal peramban, lalu menekan opsi *"Download database"*.
- Mematikan koneksi lewat profil jaringan DevTools `Offline`.
- Menyegarkan ulang / reload halaman -> Halaman aplikasi harus tetap stabil termuat.
- Mengetik dan mencari input tanpa internet jaringan -> Aplikasi merespon menggunakan pencarian IndexedDB secara akurat.
- Koneksi diputuskan balik *Online* -> *Auto-Sync Queue* melempar isian *Offline* ke backend.
