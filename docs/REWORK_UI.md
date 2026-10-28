# Rework UI/UX & Motion — Front of House & Backstage

Arah desain yang disetujui: **satu identitas (emas heritage di atas charcoal),
dua intensitas**. Panggung untuk tamu, backstage untuk kru.

Diuji dulu lewat mockup interaktif: [`mockups/front-of-house.html`](mockups/front-of-house.html).

## Dua dunia, satu sistem

| | **Front of House** | **Backstage** |
|---|---|---|
| Layar | Lucky draw, display, winners, show, landing, registrasi | Kiosk check-in & souvenir, admin |
| Rasa | Malam gala: sorot lampu, emas bercahaya | Instrumen presisi: garis tipis, angka tabular |
| Motion | Teatrikal, satu momen yang dikarang | Instan, tidak pernah menghalangi input |

Warna, font, dan radius **sama** di keduanya. Yang berbeda hanya intensitas.

## Sistem motion

Token tempo ada di [`apps/frontend/app/globals.css`](../apps/frontend/app/globals.css)
(`:root`), sehingga layar berikutnya tinggal memakainya alih-alih mengarang durasi baru:

```css
--motion-instant: 120ms;   /* umpan balik tombol, input */
--motion-fast: 200ms;      /* perubahan state operasional */
--motion-smooth: 320ms;    /* modal, transisi halaman admin */
--motion-stage: 720ms;     /* momen panggung */
--ease-out-premium: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out-premium: cubic-bezier(0.65, 0, 0.35, 1);
```

Aturan yang mengikat semua fase:

1. Satu momen yang dikarang per layar. Bukan efek tersebar.
2. Animasi tidak boleh menyembunyikan konten. `prefers-reduced-motion` mematikan
   gerak berulang, **bukan** informasinya — nama pemenang tetap terbaca.
3. Kontrol operator tidak boleh bersaing dengan panggung.

## Fase 1 — Panggung Lucky Draw (selesai)

Layar: [`apps/frontend/app/(main)/luckydraw/page.tsx`](../apps/frontend/app/(main)/luckydraw/page.tsx)

| Bagian | Perubahan |
|---|---|
| Header | Kisi tiga kolom: identitas event (kiri), wordmark (tengah), pemilih hadiah (kanan). Sebelumnya bertumpuk di tengah dan mengulang nama hadiah dua kali. |
| Panel reveal | Jadi hero: bingkai emas saat pemenang, vignette, ID mono besar, nama Cinzel, perusahaan huruf renggang. |
| Ticker | Kolom kanan kembali selebar 45% (sempat menyusut saat diekstrak), mask atas-bawah agar terbaca sebagai jendela bergulir, bukan baris terpotong. |
| Kontrol operator | Dipisah ke [`LuckyDrawControls.tsx`](../apps/frontend/components/luckydraw/LuckyDrawControls.tsx): mode panggung, layar penuh, suara. Label Indonesia, bukan "Enable/Dismiss". |
| Banner suara | Bukan lagi bilah kuning penuh lebar yang menutupi panggung. |

Bukti visual: [`mockups/impl-draw-idle-desktop.png`](mockups/impl-draw-idle-desktop.png),
[`impl-draw-winner-desktop.png`](mockups/impl-draw-winner-desktop.png),
[`impl-draw-winner-mobile.png`](mockups/impl-draw-winner-mobile.png),
[`impl-draw-winner-reduced-motion.png`](mockups/impl-draw-winner-reduced-motion.png).

### Yang sengaja dibiarkan

Logika undian (ticker, drama, suara, SSE, multi-winner) **tidak disentuh**.
Rework ini hanya mengubah permukaan dan komposisi.

## Fase 2 — Kiosk check-in & souvenir (selesai)

Layar: [`checkin/page.tsx`](../apps/frontend/app/(main)/checkin/page.tsx),
[`souvenir/page.tsx`](../apps/frontend/app/(main)/souvenir/page.tsx)

Prinsip backstage yang diterapkan: **operator harus bisa memastikan nama, nomor
meja, dan status dalam satu pandangan**, tanpa membaca dua kali.

| Bagian | Perubahan |
|---|---|
| Bar atas | Nama event, chip stasiun, tanggal, lokasi, koneksi, dan operator dalam satu baris padat. Sebelumnya dua baris dengan dua badge berbeda gaya. |
| Kolom pencarian | Satu bidang besar (68 px) dengan petunjuk `Enter` di dalamnya, indikator progres di tepi bawah, dan petunjuk singkat di bawahnya. |
| Kartu hasil | Jadi "cap": ikon status, jam, nama besar, ID mono, dan **nomor meja raksasa** di kanan. Varian warna: hijau (berhasil), emas (souvenir), kuning (duplikat), biru (offline). |
| Daftar hasil | Baris ringkas dengan meja sebagai angka tabular, pil status, dan tombol aksi. |
| Pemilih souvenir | Dropdown kiosk dengan sisa stok; peringatan tegas bila stok habis. |

Bukti visual: [`mockups/impl-kiosk-desk.png`](mockups/impl-kiosk-desk.png),
[`impl-kiosk-mobile.png`](mockups/impl-kiosk-mobile.png),
[`impl-souvenir-desk.png`](mockups/impl-souvenir-desk.png),
[`impl-souvenir-mobile.png`](mockups/impl-souvenir-mobile.png).

### Cacat yang tertangkap saat verifikasi

1. **Nomor meja hilang di mobile.** Aturan `display: none` di bawah 900 px
   menyembunyikan informasi yang justru paling penting bagi operator.
2. **Tombol terbelah dua baris** di 390 px ("Cari &" / "check-in").
3. **Pil status jatuh di bawah tombol** karena `order: 4` menimpa urutan DOM.
4. **Label "Sudah diambil" muncul dua kali** dalam satu baris (pil + tombol).
5. **Kontrol interaktif bersarang**: baris hasil souvenir diberi `role="button"`
   padahal membungkus tombol lain — membingungkan pembaca layar.

Semuanya hanya terlihat dari tangkapan layar atau dari tes yang gagal, bukan
dari tsc.

## Fase 3 — Admin (berjalan)

Prinsip backstage: **padat, presisi, tenang**. Emas hanya untuk satu aksi utama.

| Langkah | Status |
|---|---|
| Shell + judul seragam di 14 halaman admin | ✅ selesai |
| Komponen `AdminPage` / `AdminPageHeader` / `AdminStats` | ✅ selesai |
| Lapisan CSS `admin-table`, `admin-toolbar`, `admin-search`, `admin-seg` | ✅ selesai |
| Semua tabel admin memakai `.admin-table` | ✅ selesai (tamu, system ×2, turnamen) |

Sebelum: 15 halaman admin memakai **10 varian kelas judul** berbeda dan 4 lebar
shell berbeda. Sekarang seluruhnya memakai `.admin-title` dan `.admin-page`.

Bukti visual: [`mockups/impl-admin-desk.png`](mockups/impl-admin-desk.png),
[`impl-admin-mobile.png`](mockups/impl-admin-mobile.png).

> **Perlu pemeriksaan manual.** Konversi tabel tamu, system, dan turnamen
> dilakukan secara mekanis (kelas sel dipetakan ke `mono` / `dim` / `strong` /
> `right`, jumlah `<td>` diverifikasi tetap). Halaman-halaman itu di balik
> `RequireAuth`, jadi **belum dipotret ulang dengan data sungguhan** — perlu
> sekali lihat setelah login sebelum dianggap beres.

### Cacat yang tertangkap saat verifikasi

1. **Halaman admin meluber 532 px di layar 390 px.** `.admin-page` adalah flex
   item dengan `min-width: auto`, sehingga tabel terlebar menahan lebar
   halaman. Deskripsi terpotong dan kartu statistik meluber keluar layar.
   Perbaikannya `min-width: 0` pada elemen itu — bukan pada anaknya.
2. **Rute pratinjau ikut terkunci `RequireAuth`** milik layout admin; preview
   desain harus diletakkan di luar grup rute admin.
3. **Screenshot identik byte-per-byte** menandakan server lama masih menjawab.
   Pelajaran: ukur lebar elemen lewat `getBoundingClientRect`, jangan percaya
   `document.scrollWidth` (drawer navigasi mobile yang diparkir di luar layar
   ikut terhitung).

## Fase 4 — Halaman tamu publik (selesai)

Kesan pertama. Arahnya: **identitas acara tampil lebih dulu**, satu kolom
tenang, dan hanya satu hal yang harus diingat tamu.

| Layar | Status |
|---|---|
| Registrasi (`/register`) | ✅ selesai |
| Landing (`/`) | ✅ selesai |

### Registrasi

| Bagian | Sebelum | Sesudah |
|---|---|---|
| Identitas | Ikon + judul generik | Nama acara kapital beraksen emas, judul Cinzel |
| Kuota | Kartu kaca berisi bar | Garis tipis dengan angka tabular |
| Formulir | `Card` bertumpuk di dalam kartu | Satu panel datar |
| Hasil | Kartu "terima kasih" umum | **Tiket**: ID peserta mono emas, nomor antrean, nama acara |

Dua komponen baru, [RegistrationShell](../apps/frontend/components/register/RegistrationShell.tsx)
dan `RegistrationTicket`, diekstrak agar bisa dipratinjau dan diuji tanpa API
(**10 tes**).

### Landing

| Bagian | Sebelum | Sesudah |
|---|---|---|
| Judul hero | `line-clamp-2` memotong tesis; salinan Inggris | Tesis penuh, bahasa Indonesia, Cinzel `clamp` |
| Aksi | Dua tautan bergaya inline | `.land-btn` primer emas + sekunder tenang |
| Panel media | Kotak abu berlabel "Product preview" | Panel berbingkai dengan bayangan dalam |
| Latar | Datar | Sorot emas halus dari kiri atas |

### Bug yang ditemukan di landing

**Lima judul memakai token tipografi yang tidak ada.** `text-heading-xl`,
`text-heading-lg`, dan `text-body-lg` tidak terdefinisi di
[`tailwind.config.ts`](../apps/frontend/tailwind.config.ts), sehingga judul
fitur dan judul galeri dirender seukuran teks badan — kelasnya diabaikan tanpa
peringatan, dan `next build` tetap sukses. Diganti ke `heading-1`, `heading-2`,
dan `body` yang benar-benar ada.

Bukti visual: [`mockups/impl-register-desk.png`](mockups/impl-register-desk.png),
[`impl-register-mobile.png`](mockups/impl-register-mobile.png),
[`impl-register-ticket.png`](mockups/impl-register-ticket.png),
[`impl-landing-desk.png`](mockups/impl-landing-desk.png),
[`impl-landing-mobile.png`](mockups/impl-landing-mobile.png).

## Catatan lintas fase

- **Token tipografi tidak divalidasi build.** Kesalahan seperti `text-heading-xl`
  lolos dari `tsc` maupun `next build`. Jika pola ini terulang, pertimbangkan
  plugin yang memeriksa kelas Tailwind terhadap konfigurasi.
- **Tabel admin di mobile** masih bergulir horizontal di dalam panel. Untuk
  halaman yang sering dipakai di ponsel (tamu, souvenir), alternatifnya adalah
  layout kartu seperti kiosk — perlu diputuskan per halaman.
- **Halaman admin belum dipotret setelah login.** Konversi tabel diverifikasi
  lewat tsc, jumlah sel, dan build — bukan lewat mata.