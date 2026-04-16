# Laporan Perbaikan: Throttler & Responsivitas Offline Mode (16 April 2026)

Dokumen ini mencatat perbaikan teknis yang dilakukan untuk mengatasi hambatan performa dan masalah deteksi status koneksi pada sistem Registrasi Tamu.

## Masalah yang Diidentifikasi

1.  **ThrottlerException (429 Too Many Requests)**: Saat melakukan "Download Tamu untuk Akses Offline" dengan jumlah data besar (5000+ tamu), backend memutus koneksi karena mendeteksi terlalu banyak request dalam waktu singkat (melebihi limit `short` 10 req/s).
2.  **Delayed Offline Detection**: Aplikasi hanya beralih ke mode offline *setelah* request ke server gagal/timeout. Ini menyebabkan jeda beberapa detik (lag) yang mengganggu staf di lapangan saat koneksi tidak stabil.
3.  **Service Worker Health Cache**: Endpoint `/api/public/health` ter-cache oleh Service Worker, menyebabkan aplikasi tetap melaporkan status "Online" meskipun backend sebenarnya sudah mati.

---

## Perbaikan yang Diimplementasikan

### 1. Penanganan Rate Limiting (Backend & Frontend)

-   **Backend (@SkipThrottle)**: Memperbarui dekorator `@SkipThrottle` pada `EventsController`, `GuestsController`, dan `PublicController` agar secara eksplisit melewati named throttlers (`short`, `medium`, `long`). Hal ini diperlukan karena NestJS Throttler v6 tidak otomatis melewati named limiters dengan dekorator kosong.
-   **Frontend (Pacing)**: Menambahkan jeda (sleep) selama 200ms di dalam loop `handleDownloadGuests` pada `CheckinPage` untuk memberikan ruang napas bagi server saat melakukan fetch ribuan data secara paginasi.

### 2. Optimasi Responsivitas Offline (Frontend)

-   **Instant Switch**: Memodifikasi fungsi `doSearch`, `doCheckin`, dan `onScanSuccess` agar memeriksa status koneksi *sebelum* mencoba melakukan fetch ke server. Jika status sudah `offline`, aplikasi langsung beralih ke IndexedDB/Antrean tanpa mencoba ke jaringan.
-   **Deteksi Error yang Tangguh**: Memperluas cakupan deteksi error jaringan (NetworkError, Failed to fetch, OfflineMode) untuk memastikan transisi ke mode offline berjalan mulus di berbagai kondisi kegagalan.

### 3. Akurasi Status Koneksi

-   **Cache Busting**: Menambahkan parameter *timestamp* (`?t=${Date.now()}`) pada URL pengecekan kesehatan `/api/public/health` untuk memaksa bypass cache Service Worker.
-   **Forced Offline on Failure**: Menghapus ketergantungan pada `navigator.onLine`. Jika request health check gagal, status otomatis diset ke `offline`.

---

## Hasil & Verifikasi

1.  **Bulk Download**: Berhasil mengunduh 5008 tamu tanpa memicu `ThrottlerException`.
2.  **Simulasi Offline**: Status berubah menjadi "Connection Lost" seketika saat backend mati, dan pencarian beralih ke database lokal secara instan tanpa jeda tunggu (no lag).
3.  **Sinkronisasi**: Data yang di-input saat offline berhasil tersinkronisasi otomatis begitu koneksi pulih.

---

**Status:** ✅ IMPLEMENTED & TESTED  
**Tanggal:** 16 April 2026  
**File Terkait:**
- `apps/backend/src/public/public.controller.ts`
- `apps/backend/src/guests/guests.controller.ts`
- `apps/backend/src/events/events.controller.ts`
- `apps/frontend/app/checkin/page.tsx`
- `apps/frontend/lib/connection-status.ts`
