# Panduan Deploy Production

Dokumen ini menjelaskan cara deploy aplikasi Registrasi Tamu ke environment production dengan HTTPS.

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                          │
│                                                              │
│  ┌──────────┐      ┌──────────┐      ┌──────────────────┐  │
│  │ Frontend │ HTTP │ Backend  │      │    PostgreSQL    │  │
│  │  :3000   │─────>│  :4000   │─────>│      :5432       │  │
│  │  (HTTPS) │      │  (HTTP)  │      │                  │  │
│  └────┬─────┘      └──────────┘      └──────────────────┘  │
│       │                                                      │
└───────┼──────────────────────────────────────────────────────┘
        │ HTTPS (:443)
        ▼
   [Internet/Browser]
```

- **Frontend**: Serve HTTPS langsung ke client, proxy API request ke backend
- **Backend**: HTTP internal, tidak exposed ke public
- **PostgreSQL**: Database internal, tidak exposed ke public

---

## Persyaratan

- Docker & Docker Compose terinstall
- SSL Certificate (self-signed atau dari CA)
- Port 443 tersedia (atau port lain sesuai konfigurasi)

---

## Langkah-langkah Deployment

### 1. Siapkan Environment File

Copy template environment:

```bash
copy .env.production.example .env.production
```

Edit `.env.production` dengan nilai yang sesuai:

```env
# Database - WAJIB GANTI PASSWORD
DB_USER=postgres
DB_PASSWORD=<GANTI_PASSWORD_DATABASE>
DB_NAME=guest_registry

# Backend - WAJIB GANTI JWT_SECRET
BACKEND_PORT=4000
JWT_SECRET=<GANTI_DENGAN_RANDOM_STRING_64_KARAKTER>
CORS_ORIGIN=https://yourdomain.com

# Admin Account - WAJIB GANTI PASSWORD
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<GANTI_PASSWORD_ADMIN>

# Frontend
FRONTEND_PORT=443

# SMTP (Opsional - untuk kirim email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<EMAIL_ANDA>
SMTP_PASS=<APP_PASSWORD>
SMTP_FROM=noreply@yourdomain.com
```

> **PENTING**: Jangan gunakan password default! Generate JWT_SECRET yang random.

### 2. Siapkan SSL Certificate

#### Opsi A: Self-Signed Certificate (Development/Internal)

Jalankan script untuk generate self-signed certificate:

```bash
generate-ssl.bat
```

Ini akan membuat:
- `certs/server.key` - Private key
- `certs/server.crt` - Certificate

> **Catatan**: Browser akan menampilkan warning untuk self-signed certificate.

#### Opsi B: Let's Encrypt (Production dengan Domain)

1. Install certbot di server
2. Generate certificate:
   ```bash
   certbot certonly --standalone -d yourdomain.com
   ```
3. Copy certificate ke folder `certs/`:
   ```bash
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem certs/server.key
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem certs/server.crt
   ```

#### Opsi C: Certificate dari CA (SSL Berbayar)

1. Beli certificate dari CA (Comodo, DigiCert, dll)
2. Download certificate files
3. Tempatkan di folder `certs/`:
   - `certs/server.key` - Private key
   - `certs/server.crt` - Certificate (gabungkan dengan chain jika perlu)

### 3. Jalankan Deployment

```bash
deploy-prod.bat
```

Atau manual dengan docker-compose:

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### 4. Verifikasi Deployment

1. Cek status container:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. Cek logs:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

3. Akses aplikasi:
   - Buka browser: `https://localhost` (atau `https://yourdomain.com`)
   - Login dengan admin credentials dari `.env.production`

---

## Perintah Berguna

### Melihat Logs

```bash
# Semua service
docker-compose -f docker-compose.prod.yml logs -f

# Service tertentu
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Stop Aplikasi

```bash
docker-compose -f docker-compose.prod.yml down
```

### Restart Aplikasi

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Rebuild & Restart (setelah update code)

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Database

```bash
docker exec guest-db-prod pg_dump -U postgres guest_registry > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
docker exec -i guest-db-prod psql -U postgres guest_registry < backup_20241201.sql
```

---

## Troubleshooting

### Container tidak start

1. Cek logs untuk error:
   ```bash
   docker-compose -f docker-compose.prod.yml logs
   ```

2. Pastikan `.env.production` sudah diisi dengan benar

3. Pastikan port tidak digunakan aplikasi lain:
   ```bash
   netstat -an | findstr :443
   ```

### SSL Certificate Error

1. Pastikan file certificate ada:
   ```bash
   dir certs\
   ```

2. Pastikan format certificate benar (PEM format)

3. Untuk self-signed, browser akan warning - klik "Advanced" > "Proceed"

### Database Connection Error

1. Pastikan container postgres running:
   ```bash
   docker-compose -f docker-compose.prod.yml ps postgres
   ```

2. Cek password di `.env.production` sama dengan saat pertama deploy

### Tidak bisa login admin

1. Cek apakah seed sudah jalan:
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend | findstr "Seed"
   ```

2. Reset admin password dengan menjalankan seed ulang:
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run seed
   ```

---

## Keamanan

### Checklist Keamanan

- [ ] Ganti semua password default di `.env.production`
- [ ] Generate JWT_SECRET yang random (minimal 64 karakter)
- [ ] Gunakan SSL certificate yang valid untuk production
- [ ] Backup `.env.production` di tempat aman (jangan commit ke git!)
- [ ] Setup firewall untuk hanya allow port yang diperlukan
- [ ] Regular backup database

### Generate Random JWT Secret

PowerShell:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

Bash:
```bash
openssl rand -hex 32
```

Online: https://generate-secret.vercel.app/64

---

## Update Aplikasi

Untuk update ke versi baru:

1. Pull/download code terbaru

2. Rebuild dan restart:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. Migrasi database otomatis jalan saat startup

---

## Struktur File Production

```
project/
├── docker-compose.prod.yml    # Production compose file
├── .env.production            # Environment variables (JANGAN COMMIT!)
├── .env.production.example    # Template environment
├── deploy-prod.bat            # Deployment script
├── certs/                     # SSL certificates
│   ├── server.key            # Private key
│   └── server.crt            # Certificate
└── apps/
    ├── backend/
    │   └── Dockerfile        # Backend production build
    └── frontend/
        └── Dockerfile.prod   # Frontend production build dengan HTTPS
```

---

## Support

Jika mengalami masalah:

1. Cek bagian Troubleshooting di atas
2. Lihat logs untuk detail error
3. Pastikan semua persyaratan terpenuhi
