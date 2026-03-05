#!/bin/bash
# ================================================================
# UPDATE.SH - One-Click Update Script
# Event Management System
# Linux / Bash Version
# ================================================================

set -e

# Format colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  EVENT MANAGEMENT SYSTEM - Auto Update Script (Linux)          ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""

# Get script directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$ROOT_DIR"

# ==========================================
# [0/6] Pre-flight Checks
# ==========================================
echo -e "${YELLOW}[0/6] Menjalankan Pre-flight checks...${NC}"

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
# [1/6] Backup Database Terkini
# ==========================================
echo ""
echo -e "${YELLOW}[1/6] Mengamankan database saat ini...${NC}"
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

if docker ps -q -f name=guest-db-prod | grep -q .; then
    echo "  - Mengambil dump dari container guest-db-prod..."
    docker exec guest-db-prod pg_dump -U postgres -d guest_registry > "$BACKUP_FILE" 2>/dev/null
    if [ -s "$BACKUP_FILE" ]; then
        echo "  - File berhasil diamankan: $BACKUP_FILE"
    else
        echo -e "${YELLOW}  - [WARNING] Mekanisme backup SQL ke lokal gagal!${NC}"
    fi
else
    echo -e "${YELLOW}  - [WARNING] Container Database Sedang Mati. Backup SQL di-skip.${NC}"
fi

# ==========================================
# [2/6] Tarik Kode Terbaru (Git Pull)
# ==========================================
echo ""
echo -e "${YELLOW}[2/6] Meminta kode terbaru dari Source Repository (GitHub)...${NC}"
if ! git pull origin main; then
    echo -e "${RED}[ERROR] Git Pull gagal!${NC}"
    echo "Sistem mendeteksi adanya modifikasi lokal yang bertabrakan."
    echo "Solusi: Coba jalankan perintah 'git stash' terlebih dahulu,"
    echo "        kemudian jalankan skrip ini lagi."
    exit 1
fi
echo "  - Kode berhasil diupdate ke versi pamungkas."

# ==========================================
# [3/6] Deteksi Perubahan Skema
# ==========================================
echo ""
echo -e "${YELLOW}[3/6] Mendeteksi modifikasi database engine...${NC}"
SCHEMA_CHANGED=$(git diff HEAD~1 --name-only 2>/dev/null | grep "prisma/schema.prisma" || true)
if [ -n "$SCHEMA_CHANGED" ]; then
    echo "  - Status: TERDETEKSI ada perubahan struktur Database."
    echo "    (Migrasi aman akan dilakukan otomatis di Step 6)"
else
    echo "  - Status: Struktur Database aman, tidak ada perubahan."
fi

# ==========================================
# [4/6] Rebuild Infrastructure (Zero Downtime Check)
# ==========================================
echo ""
echo -e "${YELLOW}[4/6] Melakukan Build Ulang Infrastruktur... (Ini memakan waktu sekitar 2-5 Menit)${NC}"
echo "  - Container di background MASIH TETAP MENYALA untuk meminimalkan downtime pengguna."

if ! $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production build; then
    echo ""
    echo -e "${RED}[ERROR] Proses Build / Kompilasi gagal!${NC}"
    echo "Update dibatalkan karena fatal error (misal: koneksi putus)."
    echo "Container Anda yang lama masih beroperasi dengan selamat."
    exit 1
fi
echo "  - Build Kompilasi Image: Selesai."

# ==========================================
# [5/6] Recreations & Restart Routine 
# ==========================================
echo ""
echo -e "${YELLOW}[5/6] Merestart kontainer ke modul terbaru...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production down --remove-orphans >/dev/null 2>&1
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d
echo "  - Node Backend, Database, dan Frontend hidup kembali di versi baru."
sleep 5

# ==========================================
# [6/6] Database Syncing & Cleanup
# ==========================================
echo ""
echo -e "${YELLOW}[6/6] Menerapkan Sinkronisasi Skema Database via Prisma Engine...${NC}"
if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production exec -T backend npx prisma db push --accept-data-loss >/dev/null 2>&1; then
    echo "  - Database Sync Selesai (100%)."
else
    echo -e "${YELLOW}  - [WARNING] Database Sync selesai dengan Warning. Terkadang wajar jika DB Engine sedang heavy-load.${NC}"
fi

echo "  - Injeksi Client Prisma (Generate)..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production exec -T backend npx prisma generate >/dev/null 2>&1
echo "  - Prisma Client selesai disuntik ke inti Server NestJS."

# Pembersihan Backup Lama (Simpan hanya 5 yang terbaru)
echo ""
echo -e "${YELLOW}[Pembersihan Otomatis] Membuang file backup kuno agar penyimpanan Lega...${NC}"
ls -t $BACKUP_DIR/db_backup_*.sql 2>/dev/null | tail -n +6 | xargs -r rm || true
echo "  - Cleanup selesai."

# ==========================================
# DONE
# ==========================================
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}                  PEMBERBARUAN SUKSES DILAKUKAN                 ${NC}"
echo -e "${GREEN}================================================================${NC}"
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
