# Auto-Scrolling Winner History Display

Fitur ini akan menambahkan halaman display khusus yang menampilkan riwayat pemenang undian secara otomatis berjalan (auto-scrolling) secara berulang (loop). Halaman ini dapat diakses langsung dari panel Admin Prizes untuk ditampilkan ke layar besar (proyektor/LED screen).

## User Review Required

> [!IMPORTANT]
> Harap tinjau rencana ini.
> 1. Apakah arah scroll yang diinginkan benar-benar **dari atas ke bawah**, atau seperti *movie credits* (dari bawah ke atas) yang umumnya lebih lazim untuk membaca list?
> 2. Apakah kecepatan scroll ingin bisa diatur lewat tombol kecil di pojok layar, atau cukup menggunakan kecepatan stabil secara default?

> [!NOTE]
> Desain halaman ini akan mengikuti tema (background, logo, typography) yang sama dengan halaman Lucky Draw dan Souvenir.

## Proposed Changes

---

### Frontend: Admin Panel

#### [MODIFY] `apps/frontend/app/admin/prizes/page.tsx`
- Menambahkan tombol baru bertuliskan **"Display Pemenang"** (dengan icon History atau Monitor) di sebelah kanan atas halaman `/admin/prizes`.
- Tombol ini akan membuka tab baru (`target="_blank"`) menuju URL `/luckydraw/winners`.

---

### Frontend: Display Page

#### [NEW] `apps/frontend/app/luckydraw/winners/page.tsx`
- Membuat halaman UI baru yang bebas dari sidebar navigasi admin (fullscreen-ready).
- Melakukan *fetching* API `/prizes` untuk mendapatkan daftar semua hadiah beserta pemenangnya. Data akan dikelompokkan per hadiah.
- Melakukan *fetching* API `/config/event` untuk mendapatkan visual *background* (video/gambar/warna) dan logo event.
- **Logika Auto-Scroll (Seamless Loop)**:
  - Menggunakan CSS keyframes animation (`@keyframes scroll`) atau JavaScript `requestAnimationFrame` untuk menggerakkan *container* konten.
  - Untuk menciptakan *seamless loop* (berulang tanpa jeda/patah), konten *list* pemenang akan diduplikasi (dirender dua kali) di dalam *container* animasi.
- Tampilan per hadiah akan menggunakan *card* atau desain *glassmorphism* agar terlihat elegan, menampilkan nama hadiah besar, diikuti nama-nama pemenang di bawahnya.
- Halaman ini akan mendengarkan *event* SSE (`event_change`, `winner_drawn`, dsb.) untuk otomatis melakukan *fetch* ulang data hadiah apabila ada pemenang baru tanpa perlu refresh halaman manual.

## Verification Plan

### Manual Verification
1. Masuk ke halaman `/admin/prizes`.
2. Klik tombol "Display Pemenang" di pojok kanan atas.
3. Tab baru akan terbuka di `/luckydraw/winners`.
4. Pastikan visual background dan logo sama dengan pengaturan Event.
5. Perhatikan animasi teks pemenang yang bergulir perlahan. Pastikan saat *list* habis, perulangan terjadi secara mulus (*seamless*).
6. Lakukan percobaan undian baru di halaman Lucky Draw, lalu periksa halaman Display Pemenang apakah daftar pemenangnya ter-*update* tanpa perlu di-*refresh*.
