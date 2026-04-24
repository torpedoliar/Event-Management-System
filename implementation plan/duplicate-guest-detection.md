# Deteksi Tamu Ganda (Duplicate Guest Detection)

Fitur ini akan memberikan peringatan dan kemampuan untuk memfilter tamu-tamu yang memiliki data ganda (duplikat), baik dari segi ID Pendaftaran (`guestId`) maupun Nama (`name`), yang masuk ke dalam sistem dari proses Import Excel.

Saat ini, sistem Import dengan mode `skipDuplicates: true` di Prisma hanya mengabaikan duplikat jika ada *Unique Constraint* di database. Namun, struktur database saat ini tidak mengunci `guestId` sebagai *Unique Constraint* agar sistem lebih fleksibel terhadap berbagai event. Oleh karena itu, kita butuh filter khusus untuk menampilkan data ganda.

## Proposed Changes

### Backend (`apps/backend/src/guests`)

#### [MODIFY] `guests.service.ts`
- Tambahkan fungsi `getDuplicates()` yang akan:
  1. Mencari `guestId` yang muncul lebih dari 1 kali di event aktif.
  2. Mencari `name` yang muncul lebih dari 1 kali di event aktif.
  3. Mengambil seluruh record `Guest` yang memiliki `guestId` atau `name` tersebut.

#### [MODIFY] `guests.controller.ts`
- Tambahkan *endpoint* baru `GET /guests/duplicates` yang memanggil `GuestsService.getDuplicates()`. Endpoint ini diletakkan di atas rute `/:id` agar tidak dianggap parameter ID.

---

### Frontend (`apps/frontend/app/admin/guests`)

#### [MODIFY] `page.tsx`
- Tambahkan *state* `showDuplicatesOnly` (boolean).
- Tambahkan tombol **"Cek Data Ganda"** di deretan tombol atas.
- Modifikasi fungsi `load()`:
  - Jika `showDuplicatesOnly === true`, maka `fetch` ke `/guests/duplicates` dan tampilkan semua data tanpa *pagination*.
  - Jika `showDuplicatesOnly === false`, panggil *endpoint* `/guests` biasa dengan *pagination*.
- Tambahkan penanda warna (misal: baris disorot warna merah muda atau tulisan "Duplikat") jika sedang berada di mode pengecekan ganda.

## Verification Plan

### Automated Tests
- Menjalankan kompilasi TypeScript (`npm run build`) untuk memastikan tidak ada error pada struktur tipe data response.

### Manual Verification
- Melakukan klik tombol **Cek Data Ganda** pada halaman Admin Guests.
- Jika ada data ganda (tamu dengan ID atau Nama yang persis sama), mereka akan muncul berdampingan di tabel.
- Jika tidak ada, list akan kosong.
- Mengubah kembali mode ke normal memastikan seluruh daftar tamu kembali tampil.
