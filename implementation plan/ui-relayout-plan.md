# Blueprint Detail: UI Relayout & Functional Preservation Plan

Dokumen ini adalah cetak biru (blueprint) final untuk merombak tata letak (relayout) antarmuka mengacu pada panduan desain mahir (**Frontend-Design Skill**). Tujuannya adalah menghancurkan estetika "AI-Generated slop" (font standar, kotak berjejer, transparansi murahan) menuju mahakarya **Refined Dark Luxury** yang tak terlupakan (*Unforgettable*).

> [!WARNING] 
> **Aturan Mutlak (Golden Rule):** Transformasi hanya berbatas pada manipulasi visual (struktur DOM, kelas Tailwind, tipografi khusus, efek CSS). **Semua state logika komponen, `useState`, `useEffect`, antrian IndexedDB offline, dan transmisi realtime SSE DILARANG KERAS untuk diganti atau dirusak.**

---

## 1. Analisis & Strategi Relayout (Mengaplikasikan `Frontend-Design` Skill)

Berdasarkan *design skill*, kita harus mengambil arah estetika yang ekstrem dan berkarakter, bukan jalan tengah yang membosankan:

*   **Tipografi Berkarakter Ekstrem (The Typography Shift):** Meninggalkan font generik sepenuhnya. Kita akan menginjeksikan pasangan font premium. Misalnya menggunakan font Display yang sangat khas dengan kerning ketat untuk angka-angka metrik besar, dipadukan dengan *sans-serif* presisi super kecil bernuansa *uppercase tracking-wide* untuk label data.
*   **Asimtetri & Komposisi Ruang (Spatial Composition):** Tidak ada lagi grid 4-kolom yang membosankan. Kita menggunakan layout *grid-breaking*, di mana diagram utama (Hero Chart) menembus batas (bleeding edges) atau mengambil ruang secara dominan (Bento-asimetris ekstrem), sementara metrik tambahan dipadatkan secara elegan.
*   **Layered Atmosphere & Grain (Background Details):** Daripada *solid background* atau gradien linear biasa, kita akan mengimplementasikan `Glassmorphism 2.0` yang dipadukan dengan *noise/grain texture overlays* yang sangat halus, *gradient meshes* yang blur secara radikal di titik-titik tertentu (misal di belakang Angka Total Tamu), untuk menciptakan kedalaman yang riil bak kaca bertekstur.
*   **Koreografi Gerak (Orchestrated Motion):** Tidak sekadar animasi *hover* standar. Memasukkan animasi *staggered reveals* (elemen muncul berurutan dengan jeda presisi menggunakan *animation-delay*) saat halaman dimuat pertama kali untuk memberikan impresi memukau seketika.
*   **Distingsi Fokal (The Unforgettable Element):** Setiap layar harus punya satu titik tak terlupakan. Di Kiosk Check-in, area pindai tidak berbentuk kotak kaku, melainkan mirip *viewfinder* kamera sinematik dengan *crosshairs* penguncian presisi.

---

## 2. Peta Fungsionalitas Kritis per Halaman (Verifikasi & Proteksi)

Seluruh fungsi berikut **DIJAMIN TETAP ADA DAN BERFUNGSI 100%** setelah relayout arsitektural:

### A. Dashboard Admin (`/admin/dashboard`)
*   **Konektivitas:** State `connected` dari `useSSE()` yang memicu animasi *live*.
*   **Statistik Real-time:** Kalkulasi dinamis `stats.total`, `stats.checkedIn`, `stats.notCheckedIn`, dan perhitungan persentasenya via `useGuestStats()`.
*   **Chart Kedatangan:** Komponen ring/doughnut `<GuestStatsChart stats={stats} />` wajib tetap asinkron dan hidup.
*   **Form Quick Add Guest:**
    *   State input: `guestId`, `name`, `tableLocation`, `company`, `photo`.
    *   Integrasi Kamera Native: Komponen `<WebcamCapture />` yang memanipulasi `webcamOpen`.
    *   Handler formulir (*Submit* / API POST).
*   **Portal Navigation:** Navigasi menuju Check-in Kiosk, Lucky Draw, Display.
*   **Fitur Admin Override:** Override check-in/uncheck-in id manual beserta validasi modal `showUncheckModal` berlapis *password*.

### B. Kiosk Utama (`/checkin`) -> *Super Critical Path*
*   **Sistem Offline-First (IndexedDB):** Pemanggilan `offlineSyncService.init()` dan panel `<StationSetupModal />` berbasis config.
*   **Dashboard Antrian (Queue):** Triggers `<QueueManagementPanel />` pembaca data asinkron background.
*   **Dual Mode Scanner:** Kamera live HTML5Qrcode DAN formulir pencetakan tiket manual/wildcard (`q`, `setQ`).
*   **Fitur Auto-Capture:** Rutinitas snapshot otomatis bergantung kontrol `enablePhotoCapture`.
*   **Peringatan Status (Modal States):** Logika pencegahan mutlak "Sudah Check-In!" (`isDuplicateCheckIn`).
*   **Konfigurasi Visual Adaptif:** Latar belakang video/gambar mengikuti setelan `EventConfig`.

### D. Layar Terpisah & Navigasi Publik (`/login`, `/about`)
*   **Halaman Login (`/admin/login`):** Validasi form kredensial reaktif, efek *error shake* (jika ada), penyimpanan token JWT transparan, dan proteksi *redirect* navigasi.
*   **Halaman Informasi (`/about`):** Presentasi statis/animatif yang tidak bergantung pada database dinamis, tapi harus mengadopsi bahasa desain baru.

### E. Display Siaran Udara (`/luckydraw`, `/souvenir`, `/show`, `/show/my`)
*   **RNG Rolling Animation:** Mesin pengocok (Timer `setInterval`/`requestAnimationFrame` di dalam `useEffect`) untuk efek tulisan bergulir di `luckydraw` harus tetap sangat responsif.
*   **Listener SSE:** Injeksi real-time ('DRAW_WINNER').
*   **Inventori & Dropdown:** Interaksi "Habis Terbagi" (limit detection state).
*   **Persistensi Riwayat (History logs):** Tabel penampil rekam jejak kemenangan secara real-time.

### F. Manajemen Tabel Data & Kokpit Khusus (`/guests`, `/prizes`, `/events`, `/souvenirs`, `/settings/*`)
*   **Dynamic Data Grids:** Algoritma internal tabel untuk `pagination`, `sorting`, dan mapping "Select All" array lintas data tamu, event, souvenir, maupun hadiah.
*   **Modul Buffer (Ekspor/Impor):** Pembaca/penulis blob XLSX & format PDF/Excel.
*   **Kalender Event (`/admin/events/calendar`):** Render balok bulan/hari yang spesifik (bukan tabel biasa) yang terikat pada data API event.
*   **Lifecycle Data (CRUD):** Formulir edit reaktif (`/admin/guests/[id]`, `/admin/guests/new`), inline hapus dengan verifikasi ketat.

---

## 3. Eksekusi Fase Implementasi Berkelanjutan

1.  **Fase 1: Asas Suasana Ekstrem (The Atmosphere Build)**
    *   Mengganti kerangka dasar layout. Memasukkan *noise texture* tipis (grain), dan efek pendaran cahaya (*glow/flare meshes*) berbasis *brand token* di balik wrapper utama.
    *   Mengimplementasikan set CSS Font yang baru (Heading megah + body text teknis/monospaced untuk ID/Nomor) dari koleksi Google Fonts modern (via `next/font`).

2.  **Fase 2: Interaksi Publik yang Dramatis (Broadcast & Kiosk)**
    *   Merombak Kiosk Kiosk `/checkin` dengan desain antarmuka bergaya "HUD" sinematik. *Scanning frame* diubah menjadi bingkai penembak optik melayang (*floating targeting brackets*).
    *   Merombak layar siaran `luckydraw` dengan pengaturan ruang napas (*negative space*) yang luar biasa lebar sehingga teks kemenangan menjadi monumen.

3.  **Fase 3: Kokpit Intelijen Data (Dashboard Asimetris)**
    *   Mengubah halaman dashboard admin yang membosankan menjadi asimetri terencana. Tidak ada kotak-kotak terputus. Satu metrik "Angka Kedatangan" mengambil proporsi raksasa tanpa bingkai (berbaur dengan background), sementara panel formulir masuk ke bilah ramping di sisi layar (layout majalah vertikal). Menyisipkan *staggered entrance animations*.

4.  **Fase 4: Harmonisasi Tabel & Backoffice**
    *   Merobohkan konstruksi `<table className="border">` tradisional menjadi struktur data padat bermutu tinggi dengan *sticky-transparent headers* dan efek pendar halus saat kursor mengambang (*glow row hover*).

*(Validasi berkelanjutan: Sesudah setiap implementasi file dieksekusi, satu siklus audit akan berjalan tanpa kecuali untuk menarget kembali fungsi-fungsi pada Section 2)*
