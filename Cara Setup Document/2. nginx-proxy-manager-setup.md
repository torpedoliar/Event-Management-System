# Panduan Integrasi Nginx Proxy Manager (NPM)

## Arsitektur

```
                    ┌──────────────────────────────────────────┐
                    │            npm-network (shared)          │
                    │                                          │
Internet ──HTTPS──▶ │  NPM (:80/443/81)                       │
                    │      │                                   │
                    │      │ proxy_pass http                   │
                    │      ▼                                   │
                    │  Frontend (Next.js :3000)                │
                    │      │ rewrites /api/*                   │
                    │      ▼                                   │
                    │  Backend (NestJS :4000)                  │
                    │      │                                   │
                    │  ┌───┴───┐                               │
                    │  ▼       ▼                               │
                    │  PostgreSQL  Redis                       │
                    └──────────────────────────────────────────┘
```

Semua container terhubung via shared Docker network `npm-network`. Deploy dilakukan melalui **satu script** yang menjalankan kedua compose file secara berurutan.

---

## Deploy (Satu Perintah)

### Linux
```bash
chmod +x deploy-prod.sh
./deploy-prod.sh
```

### Windows
```batch
deploy-prod.bat
```

Script akan secara otomatis:
1. Membuat network `npm-network`
2. Deploy NPM (jika belum running)
3. Deploy EMS (PostgreSQL → Redis → Backend → Frontend)
4. Verifikasi konektivitas NPM ↔ Frontend
5. Menampilkan URL akses

---

## Konfigurasi NPM Dashboard (Setelah Deploy)

### Login NPM Dashboard
- URL: `http://<IP_SERVER>:81`
- Email: `admin@example.com`
- Password: `changeme` ← **ganti segera**

### Buat Proxy Host

#### Tab Details

| Field | Value |
|:------|:------|
| **Domain Names** | `event.yourdomain.com` |
| **Scheme** | `http` |
| **Forward Hostname / IP** | `guest-frontend-prod` |
| **Forward Port** | `3000` |
| **Cache Assets** | ❌ Off |
| **Block Common Exploits** | ✅ On |
| **Websockets Support** | ✅ On |

#### Tab SSL

| Field | Value |
|:------|:------|
| **SSL Certificate** | Request a new SSL Certificate |
| **Force SSL** | ✅ On |
| **HTTP/2 Support** | ✅ On |

#### Tab Advanced (WAJIB untuk SSE Live Display)

```nginx
# ===== SSE (Server-Sent Events) - Live Display =====
location /api/public/stream {
    proxy_pass http://guest-frontend-prod:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;

    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}

# ===== Upload file besar =====
client_max_body_size 100M;

# ===== Headers =====
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Host $host;
```

---

## File Terkait

| File | Fungsi |
|:-----|:-------|
| `docker-compose.npm.yml` | Container NPM (standalone) |
| `docker-compose.prod.yml` | Container EMS (join npm-network) |
| `deploy-prod.sh` | Script deploy Linux (NPM + EMS) |
| `deploy-prod.bat` | Script deploy Windows (NPM + EMS) |
| `.env.production` | Konfigurasi environment |

---

## Troubleshooting

| Masalah | Solusi |
|:--------|:-------|
| `502 Bad Gateway` | Cek: `docker network inspect npm-network` — pastikan `guest-frontend-prod` terdaftar |
| Live Display tidak update | Tambahkan Advanced config SSE (`proxy_buffering off`) |
| Upload gagal (413) | Tambahkan `client_max_body_size 100M` di Advanced |
| SSE putus tiap ~60 detik | Tambahkan `proxy_read_timeout 86400s` |
| Let's Encrypt gagal | Pastikan domain pointing ke IP server dan port 80 terbuka |
| NPM tidak bisa reach frontend | Jalankan: `docker network connect npm-network guest-frontend-prod` |

---

## Akses Langsung (Tanpa Domain)

```
http://<IP_SERVER>:3000
```

Frontend tetap bisa diakses langsung via port 3000 (HTTP) untuk testing tanpa NPM.
