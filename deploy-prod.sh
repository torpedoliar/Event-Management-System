#!/bin/bash
# ================================================================
#     EVENT MANAGEMENT SYSTEM - Production Deployment
#     Version: 1.3.0
#     Linux / Bash Version
# ================================================================

set -e

# Format colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}    EVENT MANAGEMENT SYSTEM - Production Deployment (Linux)     ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""

# Get script directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$ROOT_DIR"

# ==========================================
# [0/9] Pre-flight Checks
# ==========================================
echo -e "${YELLOW}[0/9] Pre-flight checks...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker tidak terinstall!${NC}"
    echo "Panduan instalasi: https://docs.docker.com/engine/install/"
    exit 1
fi
echo -e "  - Docker: OK"

# Check Docker Compose (support both docker-compose and docker compose plugin)
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}[ERROR] Docker Compose tidak terinstall!${NC}"
    exit 1
fi
echo -e "  - Docker Compose: OK ($DOCKER_COMPOSE_CMD)"

# Check required files
for file in "docker-compose.prod.yml" "apps/backend/Dockerfile" "apps/frontend/Dockerfile.prod"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}[ERROR] File $file tidak ditemukan!${NC}"
        exit 1
    fi
done
echo -e "  - Required files: OK"

# Check/Create .env.production
if [ ! -f ".env.production" ]; then
    if [ -f ".env.production.example" ]; then
        echo -e "${YELLOW}  - Membuat .env.production dari template...${NC}"
        cp .env.production.example .env.production
    else
        echo -e "${RED}[ERROR] File .env.production dan .env.production.example tidak ditemukan!${NC}"
        exit 1
    fi
fi
echo -e "  - .env.production: OK"

# Load and validate environment variables
source .env.production

ENV_VALID=1
if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" == "CHANGE_THIS_STRONG_PASSWORD" ]; then ENV_VALID=0; fi
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" == "CHANGE_THIS_TO_RANDOM_64_CHARACTER_STRING_FOR_SECURITY" ]; then ENV_VALID=0; fi
if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" == "CHANGE_THIS_ADMIN_PASSWORD" ]; then ENV_VALID=0; fi

if [ $ENV_VALID -eq 0 ]; then
    echo ""
    echo -e "${RED}================================================================${NC}"
    echo -e "${RED} [WARNING] File .env.production perlu dikonfigurasi!${NC}"
    echo -e "${RED}================================================================${NC}"
    echo " Nilai saat ini:"
    echo "   - DB_PASSWORD    : $DB_PASSWORD"
    echo "   - JWT_SECRET     : ${JWT_SECRET:0:20}..."
    echo "   - ADMIN_PASSWORD : $ADMIN_PASSWORD"
    echo ""
    echo " Jika nilai masih default, edit file .env.production"
    read -p " Lanjutkan deploy dengan nilai ini? (y/n): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        echo "Edit file: $ROOT_DIR/.env.production"
        exit 1
    fi
fi
echo -e "  - Environment variables: OK"

LOCAL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then LOCAL_IP="localhost"; fi

# ==========================================
# [1/9] SSL Certificate Check/Generate
# ==========================================
echo ""
echo -e "${YELLOW}[1/9] Checking SSL certificates...${NC}"

mkdir -p certs apps/backend/certs apps/frontend/certs

if [ ! -f "certs/server.key" ]; then
    echo "  - SSL certificate tidak ditemukan, generating..."
    
    if ! command -v openssl &> /dev/null; then
        echo -e "${RED}[ERROR] OpenSSL tidak terinstall.${NC}"
        read -p " Lanjutkan tanpa HTTPS? (y/n): " confirm
        if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
            exit 1
        fi
    else
        openssl genrsa -out certs/server.key 2048 2>/dev/null
        openssl req -new -x509 -key certs/server.key -out certs/server.crt -days 365 -subj "/C=ID/ST=Jakarta/L=Jakarta/O=EventManagement/CN=$LOCAL_IP" 2>/dev/null
        
        if [ ! -f "certs/server.key" ]; then
            echo -e "${RED}[ERROR] Gagal generate SSL certificate!${NC}"
            exit 1
        fi
        echo "  - SSL certificate generated for $LOCAL_IP"
    fi
fi

if [ -f "certs/server.key" ]; then
    cp certs/server.key apps/backend/certs/ 2>/dev/null || true
    cp certs/server.crt apps/backend/certs/ 2>/dev/null || true
    cp certs/server.key apps/frontend/certs/ 2>/dev/null || true
    cp certs/server.crt apps/frontend/certs/ 2>/dev/null || true
    echo -e "  - SSL certificates: OK"
fi

# ==========================================
# [2/9] Optional Backup
# ==========================================
echo ""
echo -e "${YELLOW}[2/9] Checking for existing deployment...${NC}"

if docker ps -q -f name=guest-db-prod | grep -q .; then
    echo "  - Existing deployment found"
    read -p " Backup database sebelum deploy? (y/n): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo "  - Creating backup..."
        DATETIME=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="backup_pre_deploy_${DATETIME}.sql"
        docker exec guest-db-prod pg_dump -U postgres -d guest_registry > "$BACKUP_FILE" 2>/dev/null
        if [ -f "$BACKUP_FILE" ]; then
            echo "  - Backup saved: $BACKUP_FILE"
        else
            echo -e "${YELLOW}  - [WARNING] Backup gagal, melanjutkan deployment...${NC}"
        fi
    fi
else
    echo "  - No existing deployment (fresh install)"
fi

# ==========================================
# [3/9] Stop Existing Containers
# ==========================================
echo ""
echo -e "${YELLOW}[3/9] Stopping existing containers...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production down >/dev/null 2>&1
echo "  - Containers stopped"

# ==========================================
# [4/9] Build Containers
# ==========================================
echo ""
echo -e "${YELLOW}[4/9] Building containers (this may take 5-10 minutes)...${NC}"
if ! $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production build --no-cache; then
    echo ""
    echo -e "${RED}[ERROR] Build failed! Checking common issues...${NC}"
    echo "Possible fixes:"
    echo "  1. Check internet connection"
    echo "  2. Check disk space: docker system df"
    echo "  3. Check logs above for specific errors"
    exit 1
fi
echo "  - Build completed successfully"

# ==========================================
# [5/9] Start Database
# ==========================================
echo ""
echo -e "${YELLOW}[5/9] Starting database...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d postgres

echo "  - Waiting for database to be ready..."
RETRY=0
while ! docker exec guest-db-prod pg_isready -U postgres >/dev/null 2>&1; do
    RETRY=$((RETRY+1))
    if [ $RETRY -gt 60 ]; then
        echo -e "${RED}[ERROR] Database timeout after 2 minutes!${NC}"
        exit 1
    fi
    sleep 2
done
echo "  - Database ready (took $RETRY attempts)"

# ==========================================
# [6/9] Database Initialization
# ==========================================
echo ""
echo -e "${YELLOW}[6/9] Prisma Database Initialization...${NC}"
# Use a temporary backend container to push the schema
echo "  - Pushing database schema via Prisma..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production run --rm backend sh -c "npx prisma generate && npx prisma db push --accept-data-loss"
echo "  - Database schema is synced."

# ==========================================
# [7/9] Start Backend
# ==========================================
echo ""
echo -e "${YELLOW}[7/9] Starting backend...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d backend

echo "  - Waiting for backend API..."
RETRY=0
while ! docker exec guest-backend-prod wget -q -O /dev/null http://127.0.0.1:4000/api/health >/dev/null 2>&1; do
    RETRY=$((RETRY+1))
    if [ $RETRY -gt 45 ]; then
        echo -e "${YELLOW}  - [WARNING] Backend health check timeout${NC}"
        if ! docker ps -q -f name=guest-backend-prod | grep -q .; then
            echo -e "${RED}[ERROR] Backend container failed to start!${NC}"
            exit 1
        fi
        echo "  - Container is running, continuing..."
        break
    fi
    sleep 2
done
echo "  - Backend ready"

# ==========================================
# [8/9] Start Frontend
# ==========================================
echo ""
echo -e "${YELLOW}[8/9] Starting frontend...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d frontend

sleep 5
if ! docker ps -q -f name=guest-frontend-prod | grep -q .; then
    echo "  - Retrying frontend start..."
    docker start guest-frontend-prod >/dev/null 2>&1
    sleep 3
fi
echo "  - Frontend started"

# ==========================================
# [9/9] Final Verification
# ==========================================
echo ""
echo -e "${YELLOW}[9/9] Verifying deployment...${NC}"
sleep 3

ALL_OK=1
DB_STATUS="FAIL"
BACKEND_STATUS="FAIL"
FRONTEND_STATUS="FAIL"

if docker ps -q -f name=guest-db-prod | grep -q .; then DB_STATUS="OK"; else ALL_OK=0; fi
if docker ps -q -f name=guest-backend-prod | grep -q .; then BACKEND_STATUS="OK"; else ALL_OK=0; fi
if docker ps -q -f name=guest-frontend-prod | grep -q .; then FRONTEND_STATUS="OK"; else ALL_OK=0; fi

echo ""
echo "================================================================"
echo "                    DEPLOYMENT STATUS"
echo "================================================================"
echo ""
echo "  Database  : [$DB_STATUS]"
echo "  Backend   : [$BACKEND_STATUS]"
echo "  Frontend  : [$FRONTEND_STATUS]"
echo ""

if [ $ALL_OK -eq 0 ]; then
    echo -e "${RED}[WARNING] Some services may have issues!${NC}"
    echo "Troubleshooting commands:"
    echo "  docker logs guest-db-prod"
    echo "  docker logs guest-backend-prod"
    echo "  docker logs guest-frontend-prod"
else
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}          EVENT MANAGEMENT SYSTEM v1.3.0 DEPLOYED!              ${NC}"
    echo -e "${GREEN}================================================================${NC}"
fi

echo ""
echo "================================================================"
echo "                      ACCESS URLS"
echo "================================================================"
echo "  Local:"
echo "    https://localhost:${FRONTEND_PORT:-443}"
echo ""
echo "  Network:"
echo "    https://$LOCAL_IP:${FRONTEND_PORT:-443}"
echo ""
echo "  Login: https://$LOCAL_IP:${FRONTEND_PORT:-443}/admin/login"
echo "================================================================"
echo ""
echo " Deployment selesai."
