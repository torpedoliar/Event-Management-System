# Rekomendasi Pengembangan & Temuan Perbaikan (Roadmap)

Dokumen ini berisi daftar temuan dan saran perbaikan untuk meningkatkan kualitas, keamanan, dan pengalaman pengguna (UX) pada sistem Registrasi Tamu.

---

## 1. Optimasi Sinkronisasi & Data (Performa)

### Delta Sync (Sinkronisasi Parsial)
*   **Temuan**: Saat ini download tamu mengambil seluruh database. Jika data >10.000, beban bandwidth dan memori browser akan sangat tinggi.
*   **Saran**: Implementasikan *Delta Sync* yang hanya menarik data yang berubah berdasarkan timestamp `lastSyncAt`.

### Client-side Image Compression
*   **Temuan**: Foto tamu dikirim dalam ukuran asli, membebani antrean offline dan storage IndexedDB.
*   **Saran**: Gunakan library seperti `browser-image-compression` di frontend untuk mengecilkan ukuran foto sebelum disimpan ke database lokal atau dikirim ke server.

---

## 2. Keamanan & Proteksi Data (Security)

### Rate Limiting Berbasis Station ID
*   **Temuan**: Dekorator `@SkipThrottle` membuka endpoint publik secara total.
*   **Saran**: Terapkan limitasi yang lebih cerdas di backend—berikan kuota request lebih tinggi hanya untuk request yang menyertakan `Station-ID` yang valid/terdaftar.

### Enkripsi Penyimpanan Lokal (IndexedDB)
*   **Temuan**: Data tamu (PII - Personally Identifiable Information) tersimpan secara teks polos (*plain text*) di browser.
*   **Saran**: Gunakan enkripsi ringan (misal: AES) pada data sensitif di IndexedDB agar tidak mudah diakses melalui DevTools.

---

## 3. Pengalaman Pengguna di Lapangan (UX)

### Sound Feedback (Audio)
*   **Temuan**: Staf sering tidak melihat layar saat meja registrasi sangat ramai.
*   **Saran**: Tambahkan efek suara:
    *   *Beep Tinggi*: Check-in Sukses.
    *   *Beep Rendah/Buzz*: Gagal atau Duplikat.

### Fuzzy Search Lokal (IndexedDB)
*   **Temuan**: Pencarian offline saat ini bersifat kaku (*substring match*). Kesalahan ketik satu huruf membuat tamu tidak ditemukan.
*   **Saran**: Implementasikan `Fuse.js` untuk pencarian di IndexedDB agar mendukung *typo tolerance*.

---

## 4. Arsitektur Backend (Scalability)

### Background Image Processing
*   **Temuan**: Proses resizing foto saat upload bisa menghambat responsivitas API check-in.
*   **Saran**: Gunakan *Message Queue* (seperti BullMQ dengan Redis) untuk memproses gambar di latar belakang.

### Database Indexing (GIN/Trigram)
*   **Temuan**: Pencarian nama pada skala besar (>50rb tamu) akan melambat.
*   **Saran**: Tambahkan GIN Index atau Trigram Index pada kolom `name` di PostgreSQL untuk mempercepat pencarian teks.

---

## 5. Monitoring & Observabilitas

### Station Health Dashboard
*   **Temuan**: Admin pusat sulit memantau stasiun mana yang sedang offline atau mengalami penumpukan antrean.
*   **Saran**: Buat dashboard khusus admin untuk memantau status heartbeat, versi cache, dan jumlah *pending queue* dari tiap stasiun secara real-time.

### Audit Log Sinkronisasi
*   **Temuan**: Sulit melakukan rekonsiliasi jika terjadi perbedaan data antara stasiun.
*   **Saran**: Catat histori sinkronisasi yang lebih detail (kapan mulai offline, durasi offline, dan ID tamu mana saja yang disinkronkan).
