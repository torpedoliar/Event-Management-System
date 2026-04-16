# Rencana Perbaikan Fitur Offline Check-in

Dokumen ini merangkum rencana implementasi teknis untuk mengatasi kelemahan (flaws) yang ditemukan pada sistem Offline Check-in multi-station.

## User Review Required
> [!IMPORTANT]
> - Langkah di bawah membutuhkan instalasi `next-pwa` agar sistem kebal terhadap *refresh browser* saat offline (PWA Offline First).
> - Tambahan fitur *fetch* massal diperlukan untuk menyimpan semua data tamu ke IndexedDB (`localGuests`) demi pencarian nama saat internet mati. 

---

## Proposed Changes (IMPLEMENTED 16 April 2026)

### 1. Offline & PWA Support (ALREADY CONFIGURED)
- Menambahkan *dependency* `next-pwa` untuk Service Worker otomatis.
- Membungkus *config* saat ini dengan `withPWA` agar aplikasi menghasilkan / memasang Service Worker yang melayani cache HTML dan struktur App Router Next.js.

### 2. Memperbaiki Bug `doSearch` dan Pencarian Lokal (DONE)
- **Hapus Cache Lama Sebelum Mencari**: Tambahkan `setResults([])` di awal `doSearch`. (Implementasi lebih lanjut: Memaksa pencarian lokal seketika jika status offline).
- **Download Database Lokal & Throttler Fix**: Menangani error 429 (Too Many Requests) saat download tamu massal dengan `@SkipThrottle` (backend) dan jeda 200ms per batch (frontend).
- **Instant Offline Switch**: Mengubah logika `doSearch`, `doCheckin`, dan `onScanSuccess` untuk langsung menggunakan pencarian lokal (IndexedDB) jika `connectionStatusService` melaporkan status offline, tanpa menunggu *timeout* jaringan.

### 3. Peningkatan Feedback Admin & Akurasi Koneksi (DONE)
- **Bypass Health Cache**: Menambahkan parameter unik `?t=${Date.now()}` pada health check untuk menembus cache Service Worker.
- **Forced Offline**: Jika request health check gagal, status otomatis diset ke `offline`.
- **Indikator Panel**: Tampilkan indikator spesifik: **"X tamu ditarik cache lokal"** di panel.

---

## Final Status (16 April 2026)

✅ **Throttler & Responsivitas Fixes**: Selesai diimplementasikan.
✅ **Auto-Sync Queue**: Berjalan normal saat koneksi kembali online.
✅ **Instant Switching**: Aplikasi responsif saat simulasi offline.
