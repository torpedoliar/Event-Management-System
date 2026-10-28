/**
 * Dijalankan sebelum setiap berkas tes.
 *
 * Tes integrasi memakai database PostgreSQL sungguhan (bukan mock) karena
 * perilaku yang diuji - konkurensi, transaksi, advisory lock - hanya nyata
 * jika dijalankan di atas database sesungguhnya.
 *
 * Siapkan database uji lebih dulu:
 *   bash scripts/test-db.sh
 */
process.env.NODE_ENV = 'test';
