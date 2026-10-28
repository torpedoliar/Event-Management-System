#!/bin/bash
# ================================================================
# UPDATE.SH - One-Click Update Script v1.3.1
# Event Management System
# Linux / Bash Version
# ================================================================

set -e

# Format colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  EVENT MANAGEMENT SYSTEM - Auto Update Script v1.3.1 (Linux)   ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""

# Get script directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$ROOT_DIR"

# ==========================================
# [0/7] Pre-flight Checks
# ==========================================
echo -e "${YELLOW}[0/7] Menjalankan Pre-flight checks...${NC}"

if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}[ERROR] docker-compose.prod.yml tidak ditemukan!${NC}"
    echo "Script ini harus dijalankan di dalam root folder proyek."
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker tidak terinstall!${NC}"
    exit 1
fi

# Check Docker Compose Commands
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERROR] Docker Compose tidak terinstall!${NC}"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo -e "${RED}[ERROR] File konfigurasi .env.production tidak ditemukan!${NC}"
    echo "Update gagal. Sistem belum pernah di-deploy dengan benar."
    exit 1
fi

# ==========================================
# [1/7] Backup Database Terkini
# ==========================================
echo ""
echo -e "${YELLOW}[1/7] Mengamankan database saat ini...${NC}"
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Nama database diambil dari .env.production agar tidak hardcoded
DB_USER=$(grep -E '^DB_USER=' .env.production 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
DB_USER=${DB_USER:-postgres}
DB_NAME=$(grep -E '^DB_NAME=' .env.production 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
DB_NAME=${DB_NAME:-guest_registry}

if docker ps -q -f name=guest-db-prod | grep -q .; then
    echo "  - Mengambil dump dari container guest-db-prod ($DB_USER@$DB_NAME)..."
    set +e
    docker exec guest-db-prod pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges > "$BACKUP_FILE" 2>/dev/null
    DUMP_RC=$?
    set -e
    # Backup harus utuh: file kosong atau tanpa penanda akhir berarti terpotong,
    # dan update TIDAK boleh dilanjutkan tanpa jaring pengaman.
    if [ "$DUMP_RC" -ne 0 ] || [ ! -s "$BACKUP_FILE" ] || ! tail -40 "$BACKUP_FILE" | grep -q 'PostgreSQL database dump complete'; then
        echo -e "${RED}  - [ERROR] Backup database GAGAL atau tidak lengkap!${NC}"
        echo "    Perbaikan: jalankan ulang setelah memastikan container database sehat."
        exit 1
    fi
    echo "  - File berhasil diamankan & terverifikasi: $BACKUP_FILE"
else
    echo -e "${RED}  - [ERROR] Container database tidak berjalan - backup tidak dapat dibuat.${NC}"
    echo "    Update dibatalkan agar tidak ada perubahan tanpa backup."
    exit 1
fi

# ==========================================
# [2/7] Tarik Kode Terbaru (Git Pull)
# ==========================================
echo ""
echo -e "${YELLOW}[2/7] Meminta kode terbaru dari Source Repository (GitHub)...${NC}"
if ! git pull origin main; then
    echo -e "${RED}[ERROR] Git Pull gagal!${NC}"
    echo "Sistem mendeteksi adanya modifikasi lokal yang bertabrakan."
    echo "Solusi: Coba jalankan perintah 'git stash' terlebih dahulu,"
    echo "        kemudian jalankan skrip ini lagi."
    exit 1
fi
echo "  - Kode berhasil diupdate ke versi pamungkas."

# ==========================================
# [3/7] Deteksi Perubahan Skema
# ==========================================
echo ""
echo -e "${YELLOW}[3/7] Mendeteksi modifikasi database engine...${NC}"
SCHEMA_CHANGED=$(git diff HEAD~1 --name-only 2>/dev/null | grep "prisma/schema.prisma" || true)
if [ -n "$SCHEMA_CHANGED" ]; then
    echo "  - Status: TERDETEKSI ada perubahan struktur Database."
    echo "    (Migrasi aman akan dilakukan otomatis di Step 7)"
else
    echo "  - Status: Struktur Database aman, tidak ada perubahan."
fi

# ==========================================
# [4/7] Persiapan Rebuild
# ==========================================
echo ""
echo -e "${YELLOW}[4/7] Membersihkan container lama yang berstatus exited...${NC}"
docker container prune -f > /dev/null 2>&1 || true
echo "  - Pembersihan container selesai."

# ==========================================
# [5/7] Rebuild Infrastructure (Zero Downtime Check)
# ==========================================
echo ""
echo -e "${YELLOW}[5/7] Melakukan Build Ulang Infrastruktur... (Ini memakan waktu sekitar 2-5 Menit)${NC}"
echo "  - Container di background MASIH TETAP MENYALA untuk meminimalkan downtime pengguna."

if ! $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production build --no-cache; then
    echo ""
    echo -e "${RED}[ERROR] Proses Build / Kompilasi gagal!${NC}"
    echo "Update dibatalkan karena fatal error (misal: koneksi putus)."
    echo "Container Anda yang lama masih beroperasi dengan selamat."
    exit 1
fi
echo "  - Build Kompilasi Image: Selesai."

# ==========================================
# [6/7] Recreations & Restart Routine (Force Recreate)
# ==========================================
echo ""
echo -e "${YELLOW}[6/7] Merestart kontainer dengan image terbaru...${NC}"

echo "  - Update Nginx Proxy Manager..."
$DOCKER_COMPOSE_CMD -f docker-compose.npm.yml up -d >/dev/null 2>&1

echo "  - Update Event Management System..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production down --remove-orphans >/dev/null 2>&1
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate
echo "  - Node NPM, Backend, Database, dan Frontend hidup kembali di versi baru."

# Tunggu backend healthy
echo "  - Menunggu Backend siap menerima koneksi..."
RETRY=0
while [ $RETRY -lt 30 ]; do
    RETRY=$((RETRY + 1))
    sleep 2
    if docker exec guest-backend-prod node -e "const http = require('http'); http.get('http://127.0.0.1:4000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" > /dev/null 2>&1; then
        echo "  - Backend API Online! (Siap di percobaan ke-$RETRY)"
        break
    fi
done
if [ $RETRY -ge 30 ]; then
    echo -e "${YELLOW}  - [WARNING] Backend belum merespon setelah 60 detik, melanjutkan...${NC}"
fi

# ==========================================
# [7/7] Database Syncing & Cleanup
# ==========================================
echo ""
echo -e "${YELLOW}[7/7] Menerapkan Migrasi Skema Database via Prisma Migrate...${NC}"
# Deteksi database lama (dibuat via `prisma db push`) yang belum punya riwayat
# migrasi. Tanpa penandaan baseline, `migrate deploy` akan gagal karena tabel
# sudah terlanjur ada - dan galatnya membingungkan.
set +e
LEGACY_DB=$(docker exec guest-db-prod psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT CASE WHEN to_regclass('public._prisma_migrations') IS NULL AND to_regclass('public.\"Guest\"') IS NOT NULL THEN '1' ELSE '0' END;" 2>/dev/null | tr -d '[:space:]')
set -e
if [ "$LEGACY_DB" = "1" ]; then
    echo -e "${RED}  - [ERROR] Database ini belum di-baseline ke sistem migrasi.${NC}"
    echo "    Ini normal untuk instalasi lama. Jalankan SEKALI saja:"
    echo "        bash scripts/baseline-db.sh --apply"
    echo "    lalu ulangi update ini. Backup Anda tetap aman di: $BACKUP_FILE"
    exit 1
fi
# Menggantikan `db push --accept-data-loss` yang dapat menghapus kolom beserta
# datanya tanpa konfirmasi, dan sebelumnya kegagalannya hanya dianggap peringatan
# sehingga aplikasi bisa berjalan di atas skema yang tidak sesuai.
set +e
MIGRATE_OUT=$($DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production exec -T backend npx prisma migrate deploy 2>&1)
MIGRATE_RC=$?
set -e
echo "$MIGRATE_OUT" | tail -n 20
if [ "$MIGRATE_RC" -ne 0 ]; then
    echo -e "${RED}  - [ERROR] Migrasi database GAGAL. Update dibatalkan.${NC}"
    echo "    - Database berhenti pada migrasi yang gagal, tidak ada data yang dihapus otomatis."
    echo "    - Backup tersedia di: $BACKUP_FILE"
    echo "    - Perbaiki migrasi tersebut, lalu jalankan ulang update."
    exit 1
fi
echo "  - Migrasi selesai. Skema database sesuai dengan schema.prisma."

echo "  - Injeksi Client Prisma (Generate)..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production exec -T backend npx prisma generate >/dev/null 2>&1
echo "  - Prisma Client selesai disuntik ke inti Server NestJS."

# Pembersihan Backup Lama (Simpan hanya 5 yang terbaru)
echo ""
echo -e "${YELLOW}[Pembersihan Otomatis] Membuang file backup kuno agar penyimpanan Lega...${NC}"
ls -t $BACKUP_DIR/db_backup_*.sql 2>/dev/null | tail -n +6 | xargs -r rm || true
echo "  - Cleanup selesai."

# ==========================================
# Verifikasi Akhir
# ==========================================
echo ""
echo -e "${CYAN}[Verifikasi] Memastikan semua layanan berjalan normal...${NC}"

ALL_OK=1

if docker ps -q -f name=guest-db-prod | grep -q .; then
    echo -e "  - ${GREEN}[OK]${NC} Database PostgreSQL: Berjalan"
else
    echo -e "  - ${RED}[FAIL]${NC} Database PostgreSQL: Mati!"
    ALL_OK=0
fi

if docker ps -q -f name=guest-backend-prod | grep -q .; then
    echo -e "  - ${GREEN}[OK]${NC} Backend API NestJS: Berjalan"
else
    echo -e "  - ${RED}[FAIL]${NC} Backend API NestJS: Mati!"
    ALL_OK=0
fi

if docker ps -q -f name=guest-frontend-prod | grep -q .; then
    echo -e "  - ${GREEN}[OK]${NC} Frontend Next.js: Berjalan"
else
    echo -e "  - ${RED}[FAIL]${NC} Frontend Next.js: Mati!"
    ALL_OK=0
fi

# Verifikasi image freshness
echo ""
echo -e "${CYAN}[Verifikasi] Timestamp Container:${NC}"
BACKEND_CREATED=$(docker inspect guest-backend-prod --format "{{.Created}}" 2>/dev/null || echo "N/A")
FRONTEND_CREATED=$(docker inspect guest-frontend-prod --format "{{.Created}}" 2>/dev/null || echo "N/A")
echo "  - Backend  dibuat: $BACKEND_CREATED"
echo "  - Frontend dibuat: $FRONTEND_CREATED"

# ==========================================
# DONE
# ==========================================
echo ""
if [ $ALL_OK -eq 1 ]; then
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}                  PEMBERBARUAN SUKSES DILAKUKAN                 ${NC}"
    echo -e "${GREEN}================================================================${NC}"
else
    echo -e "${RED}================================================================${NC}"
    echo -e "${RED}     PEMBERBARUAN SELESAI DENGAN WARNING - CEK STATUS DIATAS    ${NC}"
    echo -e "${RED}================================================================${NC}"
fi
echo ""
echo "  Aplikasi saat ini telah berjalan pada rilis kode terbaru."
echo "  File Backup Keamanan: $BACKUP_FILE"
echo ""
echo "  Panduan Memulihkan Data (Restore):"
echo "  Catatan: Hentikan server backend terlebih dahulu"
echo "    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml stop backend"
echo "    cat $BACKUP_FILE | docker exec -i guest-db-prod psql -U postgres guest_registry"
echo "    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml start backend"
echo ""
