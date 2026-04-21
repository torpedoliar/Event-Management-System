# Implementation Plan: Fix Background Cut by TopNav

This document outlines the changes needed to solve the issue where background images/videos on certain pages (Dashboard, Check-in, Lucky Draw, Souvenir, etc.) do not render behind the `TopNav` and look "cut off" or pushed down.

## Latar Belakang Masalah (Root Cause)
Penyebab utama masalah ini adalah **duplikasi logika rendering background** di tingkat halaman.
Dalam codebase saat ini, terdapat `ThemeBackground.tsx` yang menggunakan `<div className="fixed inset-0 -z-10">` (yang secara tepat menempatkan background di seluruh layar di belakang segalanya, termasuk `TopNav`).
Namun, di beberapa halaman (Check-in, Show) penggunaan `ThemeBackground` **dieksklusi** (di-disable).
Selanjutnya, halaman seperti `/admin/dashboard`, `/luckydraw`, `/souvenir`, `/checkin`, secara eksplisit me-render background-nya sendiri memakai `<div className="absolute inset-0">` di dalam elemen wrapper yang berada *di bawah* aliran dokumen `TopNav`. Oleh karena `TopNav` diletakkan sebagai `sticky` dan memakan tempat (sekitar 60-80px), container utama konten tersebut terdorong ke bawah. Akibatnya, background gambar/video ikut turun, sehingga bagian atasnya kosong / tidak menutupi `TopNav`, inilah yang disebut "terpotong" (cut off).

## Solusi (Proposed Changes)
Kita akan menyelesaikan masalah ini secara permanen dengan best practice: menghapus seluruh render background lokal pada masing-masing halaman dan membuat `<ThemeBackground />` bekerja secara universal.

### 1. `apps/frontend/components/ThemeBackground.tsx`
- **[MODIFY]** Menghapus variabel `excluded` beserta early return-nya. Biarkan komponen ini me-render background layar penuh secara reaktif terhadap event SSE config dan preview, untuk semua path di aplikasi. 

### 2. Halaman-Halaman dengan Custom Background
Kita akan menghapus kode rendering background lokal (`pageBgType`, `pageBgVideo`, elemen-elemen `<div className="absolute inset-0">` dan preview listener duplikat) di file-file berikut:

- **[MODIFY]** `apps/frontend/app/admin/dashboard/page.tsx`
  - Hapus `<div className="absolute inset-0 ... bg-center">`
  - Hapus `<video ...>`
  - Hapus overlay statis.
- **[MODIFY]** `apps/frontend/app/luckydraw/page.tsx`
  - Hapus logika _Dynamic Background_, _Overlay_, background dekoratif `<div className="absolute -top-[20%] ...">`
- **[MODIFY]** `apps/frontend/app/luckydraw/display/page.tsx`
  - Hapus rendering background `<video>` dan `<image>` serta *gradient fallbacks*.
- **[MODIFY]** `apps/frontend/app/souvenir/page.tsx`
  - Hapus properti _Effective Background mode_ dan div rendering background di main return.
- **[MODIFY]** `apps/frontend/app/checkin/page.tsx`
  - Hapus logic rendering background serupa agar tidak ada penindihan latar belakang global.
- **[MODIFY]** `apps/frontend/app/show/page.tsx` & `apps/frontend/app/show/my/page.tsx`
  - Hapus logic overlay dan background duplikat. (Halaman public URL akan ditenagai secara penuh dengan `ThemeBackground`).

> [!IMPORTANT]
> Harap diingat bahwa area preview di halaman **Settings Event** (`admin/settings/event/page.tsx`) TIDAK BOLEH dihapus karena merupakan area box pratinjau kecil pada tabel form, yang tidak menimpa layout window global secara penuh.

## Verification Plan
1. Buka kembali halaman Dashboard `http://localhost:3000/admin/dashboard` dan perhatikan posisi background image.
2. Background image sekarang harus memenuhi seluruh viewport aplikasi (kursor atas browser sampai bagian paling bawah page) karena letaknya di `-z-10`.
3. Komponen `TopNav` kini tidak akan memotong background melainkan melayang di atas `background` (karena sifat `.glass-nav` menembus pandang).
4. Tidak boleh ada video/efek rendering yang tumpang tindih akibat duplikat `div`. Letak image/video akan tersinkronisasi mulus saat *theme change* berjalan via _Server Sent Events_.

## User Review Required
> [!WARNING]
> Persetujuan pengguna ditunggu sebelum eksekusi rencana ini. Pembersihan rendering duplikat dapat memangkas banyak kode yang berulang, namun harap periksa apakah `/show` (Live Display URL) diperbolehkan berbagi background global dengan halaman Admin lainnya? (Ya, pada dasarnya `ThemeBackground` menyesuaikan *EventConfig* yang persis didesain untuk semua endpoint acara aktif ini).
