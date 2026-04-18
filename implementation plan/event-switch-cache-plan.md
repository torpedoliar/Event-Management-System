# [Implementation Plan] Pencegahan Isu Cache Saat Penggantian Event Aktif

Plan ini bertujuan untuk menyelesaikan masalah arsitektur pada Mode Offline di mana cache tamu (LocalGuests) dan pengaturan Station (StationConfig) belum di-reset ketika admin mengganti "Event Aktif" pada sistem backend. 

Bila hal ini tidak ditangani, gateway offline yang masih menyimpan cache event lama dapat menyebabkan operator secara tidak sengaja melakukan check-in terhadap tamu dari event sebelumnya, yang akan mengacaukan integritas data.

## User Review Required
> [!WARNING]
> Jika event diganti saat sebuah perangkat offline masih memiliki antrean (*pending queue*), apakah antrean tersebut harus tetap di-sync ke tamu di event lama, atau harus di-drop/dihapus?
>
> Pada rencana ini, **antrean tetap dipertahankan dan di-sync**. Server sudah cukup pintar untuk mencocokkan UUID tamu sehingga meskipun event diganti, check-in akan masuk ke *Guest* yang tepat dari event lama. Namun, **cache pencarian akan dihapus** sehingga operator tidak bisa lagi mencari dan menambah tamu dari event lama.

## Proposed Changes

---
### Frontend - IndexedDb Service
Menambahkan fungsi bantuan untuk reset data secara parsial agar cache bersih namun antrean offline tetap utuh.

#### [MODIFY] [indexeddb.ts](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/lib/indexeddb.ts)
- Menambahkan fungsi helper `clearEventCaches()` yang hanya menghapus `localGuests` dan `souvenirCache`, tapi membiarkan `pendingCheckins`, `pendingSouvenirs`, dan `stationConfig` tetap aman.

---
### Frontend - Checkin Page
Memastikan halaman Check-in langsung mengosongkan cache begitu mendeteksi event berubah.

#### [MODIFY] [checkin/page.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/app/checkin/page.tsx)
- Pada bagian `useEffect` untuk SSE (terutama *listener* `event_change`):
  - Panggil `indexedDBService.clearGuestCache()`.
  - Set `cachedGuestCount` menjadi 0.
  - Tampilkan pop-up peringatan atau Notifikasi (menggunakan `alert` atau komponen toast/error notification) kepada operator: *"Event aktif telah diubah oleh Admin. Cache tamu lokal telah dikosongkan. Harap download ulang data tamu untuk akses offline event yang baru."*
  - (Opsional) Cek jika `pendingCheckins` > 0, bisa ingatkan pengguna: *"Anda masih memiliki antrean sinkronisasi dari event sebelumnya. Harap pastikan perangkat terhubung ke internet agar sinkronisasi dapat selesai."*

---
### Frontend - Souvenir Page
Sama seperti pada Check-in, halaman Souvenir juga harus me-refresh cache dan daftar item souvenir.

#### [MODIFY] [souvenir/page.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/app/souvenir/page.tsx)
- Pada *listener* `event_change` di `useEffect`:
  - Panggil `indexedDBService.clearGuestCache()`.
  - Panggil `indexedDBService.clearSouvenirCache()`.
  - Set `cachedGuestCount(0)` dan kosongkan array `souvenirs`.
  - Tampilkan peringatan serupa seperti di halaman Check-in.

---
### Verification Plan

### Automated / Manual Verification
1.  **Siapkan Kondisi Offline Biasa:** Login sebagai operator, download tamu offline (Event A), pastikan indikator berubah jadi ber-cache > 0.
2.  **Trigger Penggantian Event:** Buka perangkat atau tab lain, pindahkan Event Aktif ke Event B.
3.  **Observasi Real-Time (SSE):** Operator di Event A seketika harus mendapatkan peringatan di layar (alert/toast) bahwa event berubah.
4.  **Cek Cache:** Angka indikator cache (Tamu ditarik cache lokal) harus langsung **berubah jadi 0**. Pencarian secara luring (ketika kabel internet dicabut setelah poin 3) tidak akan memunculkan daftar tamu manapun.
5.  **Cek Queue Integrity:** Buat check-in saat offline di Event A (sebelum Event diganti). Ganti event ke Event B. Sambungkan kembali internet. Pastikan sinkronisasi tetap jalan dan check-in sukses divalidasi ke database tamu Event A.
