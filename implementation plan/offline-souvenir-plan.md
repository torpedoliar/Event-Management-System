# Implementation Plan: Offline Mode untuk Halaman Souvenir (Bulk Sync Architecture)

## Latar Belakang & Analisis Mendalam
Saat ini fitur *Offline Check-in* memproses antrean menggunakan arsitektur **Bulk Sync (Batch)**. Ketika koneksi pulih, aplikasi menembak `POST /api/public/guests/sync-batch` yang mengirim keseluruhan array data sehingga backend bisa mengelola *query* massal (`Promise.all` dan `batch transaction`). Hal ini membuat lalu lintas jaringan efisien, meminimalisasi *latency*, dan mampu mencegah *race condition* (idempotency check menggunakan klien timestamp).

Tugas ini bertujuan menyempurnakan fitur Souvenir agar bekerja di atas standar **Bulk Sync** yang identik dengan Check-in.

## Fase 1: Pengembangan Backend (Node.js/NestJS)
> [!IMPORTANT]
> Karena arsitektur `Bulk Sync` difinalisasi, kita **wajib membangun Endpoint baru** pada sistem Backend.

1. **Modifikasi `souvenirs.service.ts`:**
   Membangun fungsi `syncBatchFromStation()` khusus untuk antrean klaim suvenir massal.
   - **Mekanisme Bulk:** Muat terlebih dahulu tamu (`guestIds`) dan suvenir terkait menggunakan `findMany`.
   - **Idempotency:** Menjamin rekaman *duplicate* tidak tersimpan meskipun koneksi UI putus-sambung, dengan mencocokkan `guestId`, `souvenirId` dan `clientTimestamp`.
   - **Transaksi Massal:** Eksekusi penyisipan `souvenirTake` dan pengakhiran *flag* `guest.souvenirTaken = true`.
2. **Modifikasi `public.controller.ts`:**
   Terbitkan Rute POST `/api/public/souvenirs/sync-batch` yang memanggil `syncBatchFromStation()` di atas, sekaligus memancarkan SSE (`emitEvent`) berjenis `'sync_complete'` ke klien yang sedang bertugas.

## Fase 2: Skema Basis Data Frontend (IndexedDB)
Update pada `apps/frontend/lib/indexeddb.ts`:
1. **Penambahan Field:** Memastikan tipe `LocalGuest` memuat parameter `souvenirTaken`.
2. **Tambah Tabel:** 
   - Tabel `pendingSouvenirs`: Untuk menampung klaim souvenir offline, meniru bentuk dasar tabel antrean checkin (ID, ID Tamu, ID Souvenir, *Client Time*).
   - Tabel `souvenirCache`: Mengamankan rekap rincian sisa-sisa persediaan hadiah agar tetap bisa di-render UI saat gagal mengambil data dari internet.
3. **Fungsi Jembatan:** Menambahkan instruksi `add/update/delete/clear` secara spesifik untuk `pendingSouvenirs`.

## Fase 3: Sync Service Engine (`offline-sync.service.ts`)
1. Membuka pintu keran baru bernama `syncPendingSouvenirs()`. 
2. Keran tersebut membungkus keranjang `pendingSouvenirs` dan menembaknya sekali lintas ke `/api/public/souvenirs/sync-batch`.
3. Mengembalikan rekap hasil *success*, *conflict* (karena souvenir habis / sudah ambil), layaknya `syncPending()` milik Check-in.
4. Diikat dalam `startPeriodicSync()` sehingga sistem akan selamanya menyisir check-in DAN souvenir bersamaan saat terkoneksi internet.

## Fase 4: Modifikasi Halaman Souvenir (`page.tsx`)
1. **Pendaftaran Jasa Offline Offline:** Memanggil `indexedDBService` beserta pemantau `connectionStatusService` ke panggung perenderan (*Component Mount*).
2. **Search Guest Offline Pivot:**
   Membaca error API saat internet mati -> langsung alihkan pemburuan data tamu ke cadangan lokal via `indexedDBService.getCachedGuestByGuestId(q)`.
3. **Claiming Offline Protocol:**
   Alih-alih mengirim `POST` via REST API saat kasir memindai, aplikasi hanya akan memasukkan pesanan ini ke `offlineSyncService.addPendingSouvenir(...)`.
   Ubah rekam jejak UI secara reaktif agar tombol *Ambil Hadiah* berubah status tanpa jeda tunggu internet.

## Analisis Risiko Sync Online & Solusi (Anti-Error / Anti-Crash)

Untuk memastikan tidak terjadi keruntuhan (*crash*) atau ketidakselarasan (*inconsistency*) saat koneksi beralih dari **Offline -> Online**, implementasi mutlak harus memperhatikan 4 pilar keamanan berikut:

### 1. Cegah Race Condition & Stok Tembus Minus (The Promise.all Problem)
- **Risiko:** Saat sync-batch mengirim 50 klaim suvenir, jika di backend kita menggunakan `Promise.all()` untuk mengecek stok -> 50 proses tersebut membaca "stok masih 10" secara sepersekian detik bersamaan -> semuanya meloloskan transaksi. Hasilnya, rekam medis suvenir tembus **minus 40**. 
- **Solusi:** 
  Pemrosesan suvenir di `syncBatchFromStation()` (Backend) **TIDAK BOLEH** dipukul rata pararel murni dalam validasi persediaan. Sistem harus menggunakan operasi Relasional ACID Prisma yakni `decrement: 1` dengan *Constraint Check* *(dimana jika decrement membuat stok < 0, fallback akan menggagalkan item tersebut menjadi konflik `souvenir_empty`)*. Jika *constraint check* sulit dilakukan, pemrosesan suvenir yang memiliki `souvenirId` yang sama wajib diliterasi secara sekuensial / *For...of array loop*.
  
### 2. Cegah Duplikasi Klaim UI (Idempotency Check)
- **Risiko:** Akibat koneksi *flapping* (hidup mati silih berganti secara tidak stabil di venue), UI sukses mengirim Payload Sync, namun UI tak pernah menerima balasan 200 OK server. Akibatnya UI mengira gagal, lalu menembak payload lagi 10 detik kemudian. Tamu bisa dianggap ambil 2 kali.
- **Solusi:** Di backend, sebelum menginsersi tabel `souvenirTake`, Backend mengawali pencarian rekam jejak. Jika ada `clientTimestamp` dari perangkat tersebut yang 100% sama dengan milik tamu, backend melewati rekam tersebut (menganggap sukses tanpa mengambil stok lagi).

### 3. Perlindungan Memori Peramban (WebLocks API)
- **Risiko:** Bila *User* membuka tab `/checkin` sekaligus tab `/souvenir` di PC yang sama, modul `offline-sync.service.ts` akan berjalan di kedua tab. Keduanya menerjang sirkuit interval sync sekaligus pada memori Chrome/Safari.
- **Solusi:** Harus di-*wrap* menggunakan `navigator.locks.request('offline-sync-souvenir-lock')`. Kunci khusus *(Lock string)* memastikan ketika internet menyala, UI tab A menjadi konduktor, tab B sekadar antre tanpa membakar siklus *event loop*.

### 4. Responsibilitas Angka Layar (Data Freshness / Polling)
- **Risiko:** Koneksi pulih, Backend sukses meringkus 50 antrean klaim *bulk*. Namun, persediaan layar kasir suvenir di UI masih menampilkan angka lamunan / figur fiktif peninggalan saat offline.
- **Solusi:** Layanan `offline-sync.service.ts` wajib mengirim tuas *event* ke Komponen Halaman `notifySyncListeners()`. Komponen UI saat itu wajib merespons keras untuk langsung mengeksekusi `loadSouvenirs()` dan menarik database ter-kini, agar nominal sisa barang kembali relevan detik itu juga.

## Verification Plan
1. Putuskan jaringan internal pada peramban Chrome lewat fungsi inspeksi (Off-Throttle).
2. Validasi fitur pencarian QR bisa menemukan kandidat tamu via indeksasi `LocalGuest`.
3. Konfirmasi klaim "Suvenir Diambil". Cek *DevTools > Application > IndexedDB*, saksikan tabel `pendingSouvenirs` bertambah dan stok berkurang.
4. Aktifkan jaringan ulang, saksikan keranjang Bulk tertembak tuntas sampai keranjang 0 dan termutakhirkan ke SQL.
