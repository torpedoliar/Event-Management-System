# Goal Description
Menambahkan fitur cetak "Tanda Serah Terima Hadiah" (Prize Handover Receipt) di halaman Lucky Draw. Ketika nama pemenang diklik pada `WinnerHistoryModal`, akan muncul form cetak resmi yang berisi detail pemenang, hadiah yang didapat, timestamp, dan area tanda tangan.

## User Review Required
> [!IMPORTANT]
> Harap tinjau rencana implementasi ini. Desain cetak akan disesuaikan menggunakan `@media print` sehingga saat tombol "Print" ditekan, elemen website lainnya akan disembunyikan dan hanya form serah terima yang akan dicetak dengan format kertas A4/A5.

## Open Questions
> [!WARNING]
> 1. Apakah ada format khusus (seperti Kop Surat, Logo Perusahaan, atau teks *Disclaimer* tertentu) yang ingin disertakan di dalam Tanda Serah Terima ini? 
> 2. Apakah orientasi cetak sebaiknya *Portrait* (berdiri) atau *Landscape* (mendatar)? Default yang direncanakan adalah *Portrait* setengah halaman A4.

## Proposed Changes

### 1. Update Tipe Data
Kita perlu memastikan data *timestamp* (`wonAt`) diteruskan dari backend ke komponen frontend.
#### [MODIFY] `e:\Vibe\Registrasi Tamu\apps\frontend\components\WinnerHistoryModal.tsx`
- Menambahkan property `wonAt?: string` pada interface `Winner`.
- Mengubah elemen pembungkus list pemenang menjadi tombol interaktif (dapat di-klik, dengan efek *hover cursor pointer*).
- Menambahkan state untuk mengontrol modal cetak: `selectedPrintWinner` dan `selectedPrintPrize`.

### 2. Pembuatan Komponen Cetak
#### [NEW] `e:\Vibe\Registrasi Tamu\apps\frontend\components\PrizeReceiptModal.tsx`
Membuat komponen modal khusus yang berfungsi sebagai pratinjau cetak dan wadah cetak.
- **Header**: Judul "TANDA SERAH TERIMA HADIAH"
- **Detail Pemenang**:
  - Nama Pemenang
  - ID / Nomor Identitas (Guest ID)
  - Departemen / Perusahaan
  - Divisi
  - Waktu Memenangkan Hadiah (`wonAt` diformat ke format lokal)
- **Detail Hadiah**: Nama hadiah yang didapat.
- **Area Tanda Tangan**: Kolom bersebelahan untuk "Diserahkan Oleh" (Panitia) dan "Diterima Oleh" (Pemenang).
- **Tombol Aksi**: Tombol "Cetak / Print" yang menjalankan `window.print()`.

### 3. Penyesuaian Style Cetak (CSS)
#### [MODIFY] `e:\Vibe\Registrasi Tamu\apps\frontend\app\globals.css` (atau modul CSS terkait)
- Menambahkan class utilities cetak (`@media print`).
- Class khusus `.print-only` untuk menampilkan form cetak.
- Class `.no-print` untuk menyembunyikan background aplikasi, animasi 3D, dan modal histori agar hasil cetak bersih tanpa elemen UI web.

## Verification Plan
### Manual Verification
1. Masuk ke halaman Lucky Draw (`/luckydraw/carousel` atau Classic).
2. Buka Riwayat Pemenang (Piala icon).
3. Klik salah satu kartu pemenang.
4. Verifikasi bahwa modal "Tanda Serah Terima Hadiah" muncul dengan data yang akurat (Nama, ID, Divisi, Waktu).
5. Klik tombol Cetak dan verifikasi bahwa jendela *print preview* browser terbuka dengan layout yang rapi (elemen website lainnya tersembunyi).
