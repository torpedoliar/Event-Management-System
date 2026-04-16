# Server Specification: Event Management System (Registrasi Tamu)

Dokumen ini merinci spesifikasi infrastruktur server yang direkomendasikan untuk menjalankan aplikasi Registrasi Tamu (Event Management System) secara optimal berdasarkan arsitektur teknologi (NestJS, Next.js, PostgreSQL, Redis, Docker).

---

## 1. Profil Kapasitas Optimal (Target: 1.000 - 5.000 Tamu)
*Direkomendasikan untuk event skala menengah dengan 5-15 station check-in simultan.*

| Komponen | Spesifikasi Minimum | Spesifikasi Rekomendasi (Sweet Spot) |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU (Standard) | 2 vCPU (High Compute / Optimized) |
| **RAM** | 4 GB | 8 GB |
| **Penyimpanan** | 40 GB SSD | 60 GB **NVMe SSD** |
| **Bandwidth** | 50 Mbps | 100 Mbps (Latensi Rendah) |
| **OS** | Ubuntu 22.04 LTS / Debian 11 | Ubuntu 22.04 LTS (Docker Optimized) |

---

## 2. Profil High-Load (Target: 5.000 - 20.000+ Tamu)
*Direkomendasikan untuk event besar dengan 20+ station check-in dan trafik sinkronisasi intens.*

| Komponen | Spesifikasi Rekomendasi |
| :--- | :--- |
| **CPU** | 4 vCPU (High Performance) |
| **RAM** | 16 GB |
| **Penyimpanan** | 100 GB+ **NVMe SSD** |
| **Network** | 1 Gbps (Penting untuk download data tamu massal) |

---

## 3. Optimasi Konfigurasi Software

Untuk memaksimalkan hardware di atas, pastikan konfigurasi berikut diterapkan:

### A. Database (PostgreSQL)
*   **Shared Buffers**: Set ke 25% dari total RAM server.
*   **Effective Cache Size**: Set ke 50-75% dari total RAM server.
*   **I/O Optimization**: Pastikan Docker Volume database berada pada partisi NVMe.

### B. Caching (Redis)
*   Alokasikan minimal 1-2 GB RAM khusus untuk Redis.
*   Gunakan Redis untuk `Rate Limiting` dan `Session Management` guna mengurangi beban query database utama.

### C. Web Server & Proxy (Nginx)
*   **SSE Support**: Matikan `proxy_buffering` (`proxy_buffering off;`) untuk endpoint `/api/public/stream` agar real-time updates lancar.
*   **Timeout**: Tingkatkan `proxy_read_timeout` ke `3600s` untuk menjaga koneksi SSE tetap hidup.
*   **Upload Limit**: Set `client_max_body_size` minimal ke `10M` untuk mendukung upload foto tamu.

---

## 4. Estimasi Penyimpanan Foto & Backup
*Asumsi rata-rata ukuran foto capture: 200 KB/foto.*

*   **5.000 Tamu**: ~1 GB Data Foto + ~500 MB Database.
*   **20.000 Tamu**: ~4 GB Data Foto + ~2 GB Database.
*   **Kebijakan Backup**: Sediakan ruang penyimpanan tambahan (misal: S3 atau Disk eksternal) sebesar 3x lipat dari total data aktif untuk menyimpan rotasi backup harian.

---

## 5. Ringkasan Kebutuhan Deployment
*   **Runtime**: Docker Engine 24+ & Docker Compose V2.
*   **SSL**: Sertifikat SSL (Let's Encrypt atau Custom) wajib digunakan untuk fitur akses kamera (Webcam) di frontend.
*   **Node.js**: v20.x (LTS) untuk build aplikasi di dalam container.

---
*Terakhir diperbarui: 16 April 2026*
