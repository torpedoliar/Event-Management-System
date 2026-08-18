# Design Spec: Perbaikan Pencarian Nama & Check-in Tamu Kembar

## Overview
Memperbaiki alur pencarian tamu berdasarkan nama di halaman Check-in (`/checkin`) pada kondisi:
1. **Multiple matches (Nama kembar / mirip)**: Ketika pencarian menghasilkan lebih dari 1 tamu (misal: "Edy" -> Edy Santoso PT A, Edy Santoso PT B, Edy Purnomo), sistem saat ini hanya mencatat pesan di rapid log tanpa menampilkan daftar tamu untuk dipilih. Solusi: Sistem harus merender daftar kandidat tamu lengkap dengan atribut pembeda (ID, Perusahaan, Divisi, Meja, Status) sehingga operator dapat langsung memilih tamu yang dimaksud.
2. **Single match (Pencarian 1 nama spesifik)**: Ketika pencarian nama menghasilkan tepat 1 tamu (misal: "gisell"), sistem harus menampilkan dialog konfirmasi jelas ("Benar tamu ini yang mau check-in?") sebelum check-in diproses.

## User Flow & Requirements

### 1. Single Name Search Result Flow
- **Trigger**: Operator mengetik nama (misal "gisell") dan menekan Enter atau klik "Cari & Check-in".
- **Kondisi**: Hasil pencarian mengembalikan tepat 1 tamu dan query terdeteksi sebagai pencarian nama (`isNameSearchQuery`).
- **Tampilan**: Modal konfirmasi muncul di tengah layar:
  - Judul: "Konfirmasi Check-in Tamu"
  - Deskripsi: "Pastikan identitas tamu sudah benar sebelum melanjutkan check-in."
  - Detail Tamu:
    - Foto profil (atau icon placeholder)
    - Nama Lengkap (ukuran besar dan tebal)
    - ID Tamu (format mono)
    - Perusahaan & Divisi / Departemen
    - Nomor Meja / Ruangan
    - Status Check-in saat ini (Belum Check-in / Sudah Check-in)
  - Aksi:
    - Tombol "Batal": Menutup modal dan memfokuskan kembali input pencarian.
    - Tombol "Konfirmasi Check-in": Menjalankan fungsi check-in untuk tamu tersebut.

### 2. Multiple Name Search Results Flow (Duplicate / Similar Names)
- **Trigger**: Operator mengetik nama (misal "Edy") dan menekan Enter atau klik "Cari & Check-in".
- **Kondisi**: Hasil pencarian mengembalikan > 1 tamu.
- **Frontend State Update**:
  - `rapidQueueRef` & `processRapidQueue`: Memastikan state `results` diisi dengan semua data tamu yang ditemukan (`setResults(data)`).
  - Rapid log menambahkan entri status info: `Ditemukan {count} tamu. Silakan pilih tamu di bawah.`
- **Tampilan Hasil (`results`)**:
  - Header counter: `Ditemukan X tamu - Pilih tamu untuk check-in`
  - Setiap kartu tamu menyajikan:
    - Foto profil
    - Nama Lengkap
    - ID Tamu & Nomor Meja
    - Perusahaan & Divisi
    - Status badge: `Belum Check-in` atau `Sudah Check-in`
    - Tombol aksi: `Check-in` (berubah menjadi loading saat diklik)
- **Aksi Pemilihan**:
  - Mengklik tombol "Check-in" pada kartu tamu langsung memanggil `doCheckin(guest, true)`.
  - Menggunakan endpoint `/public/guests/checkin-by-id` dengan payload `{ id: guest.id }` (UUID unik), sehingga tidak terjadi bentrok atau salah sasaran walau memiliki `guestId` atau `name` yang sama.

### 3. Offline Mode Parity
- Pada `processRapidQueue` dan `doSearch` di mode offline (IndexedDB local cache):
  - Jika pencarian menghasilkan 1 tamu nama: tampilkan modal konfirmasi `pendingNameCheckin`.
  - Jika pencarian menghasilkan > 1 tamu: `setResults(matchedGuests)` dan tampilkan pesan pemilih.
  - Check-in offline menggunakan `offlineSyncService.addToQueue` dan `indexedDBService.updateCachedGuest`.

## Technical Implementation Details

### File yang Dimodifikasi
- `apps/frontend/app/(main)/checkin/page.tsx`

### Perubahan Spesifik
1. **`processRapidQueue`**:
   - Tambahkan `setResults(data)` ketika `data.length > 1` (baik online maupun offline) agar UI kartu hasil pencarian ter-render.
   - Perbaiki log status rapid queue agar lebih deskriptif dan tidak menyesatkan sebagai fatal error.
2. **`doSearch`**:
   - Pastikan pemetaan hasil dan handling 1 tamu vs multi tamu konsisten dengan `processRapidQueue`.
3. **Modal Konfirmasi (`pendingNameCheckin`)**:
   - Poles layout visual modal: foto profil, badge status, badge perusahaan, dan teks konfirmasi yang tegas ("Apakah benar tamu bernama X ini yang mau check-in?").
4. **List Hasil (`results`)**:
   - Tambahkan indikator status check-in pada masing-masing kartu tamu agar operator mengetahui jika salah satu nama kembar sudah pernah check-in sebelumnya.

## Verification Plan
1. **Pencarian 1 Nama**: Ketik nama unik (misal "gisell") -> tekan Enter -> Modal konfirmasi muncul dengan info lengkap -> klik Konfirmasi -> Check-in sukses.
2. **Pencarian Nama Kembar**: Buat/cari nama dengan 2 data (misal "Edy") -> tekan Enter -> Muncul 2 kartu tamu dengan detail perusahaan/meja masing-masing -> klik tombol Check-in pada salah satu tamu -> Hanya tamu yang dipilih yang ter-check-in.
3. **Pencarian Kode QR / ID**: Scan QR atau ketik ID Tamu langsung -> Check-in instan tanpa modal konfirmasi nama (alur fast QR dipertahankan).
