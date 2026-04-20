#!/bin/bash
# ================================================================
#     EVENT MANAGEMENT SYSTEM - Production Deployment with NPM
#     Version: 2.0.0
#     Linux / Bash Version
# ================================================================

set -e

# Format colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  EVENT MANAGEMENT SYSTEM + NGINX PROXY MANAGER Deployment     ${NC}"
echo -e "${GREEN}  Version 2.0.0                                                ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""

# Get script directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$ROOT_DIR"

# ==========================================
# [0/11] Pre-flight Checks
# ==========================================
echo -e "${YELLOW}[0/11] Pre-flight checks...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker tidak terinstall!${NC}"
    echo "Panduan instalasi: https://docs.docker.com/engine/install/"
    exit 1
fi
echo -e "  - Docker: OK"

# Check Docker Compose
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
for file in "docker-compose.prod.yml" "docker-compose.npm.yml" "apps/backend/Dockerfile" "apps/frontend/Dockerfile.prod"; do
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
        echo -e "${RED}[ERROR] File .env.production tidak ditemukan!${NC}"
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
# [1/11] Create Shared Network
# ==========================================
echo ""
echo -e "${YELLOW}[1/11] Creating shared Docker network...${NC}"

if docker network inspect proxy-network &>/dev/null; then
    echo "  - Network 'proxy-network' sudah ada"
else
    docker network create proxy-network
    echo "  - Network 'proxy-network' created"
fi

# ==========================================
# [2/11] Deploy Nginx Proxy Manager
# ==========================================
echo ""
echo -e "${YELLOW}[2/11] Deploying Nginx Proxy Manager...${NC}"

$DOCKER_COMPOSE_CMD -f docker-compose.npm.yml up -d
echo "  - NPM container started/verified"

# Wait for NPM to be ready
echo "  - Waiting for NPM to be ready..."
RETRY=0
while ! docker exec nginx-proxy-manager /bin/check-health &>/dev/null; do
    RETRY=$((RETRY+1))
    if [ $RETRY -gt 30 ]; then
        echo -e "${YELLOW}  - [WARNING] NPM health check timeout, continuing...${NC}"
        break
    fi
    sleep 2
done
echo "  - NPM ready"

# ==========================================
# [3/11] Optional Backup
# ==========================================
echo ""
echo -e "${YELLOW}[3/11] Checking for existing EMS deployment...${NC}"

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
    echo "  - No existing EMS deployment (fresh install)"
fi

# ==========================================
# [4/11] Stop Existing EMS Containers
# ==========================================
echo ""
echo -e "${YELLOW}[4/11] Stopping existing EMS containers...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production down >/dev/null 2>&1
echo "  - EMS containers stopped"

# ==========================================
# [5/11] Build EMS Containers
# ==========================================
echo ""
echo -e "${YELLOW}[5/11] Building EMS containers (may take 5-10 minutes)...${NC}"
if ! $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production build --no-cache; then
    echo ""
    echo -e "${RED}[ERROR] Build failed!${NC}"
    echo "Troubleshooting:"
    echo "  1. Check internet connection"
    echo "  2. Check disk space: docker system df"
    echo "  3. Check logs above for specific errors"
    exit 1
fi
echo "  - Build completed successfully"

# ==========================================
# [6/11] Start Database & Redis
# ==========================================
echo ""
echo -e "${YELLOW}[6/11] Starting database & Redis...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

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
echo "  - Database ready"

echo "  - Waiting for Redis to be ready..."
RETRY=0
while ! docker exec guest-redis-prod redis-cli ping >/dev/null 2>&1; do
    RETRY=$((RETRY+1))
    if [ $RETRY -gt 30 ]; then
        echo -e "${YELLOW}  - [WARNING] Redis health check timeout${NC}"
        break
    fi
    sleep 2
done
echo "  - Redis ready"

# ==========================================
# [7/11] Database Initialization
# ==========================================
echo ""
echo -e "${YELLOW}[7/11] Prisma Database Initialization...${NC}"
echo "  - Pushing database schema via Prisma..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production run --rm backend sh -c "npx prisma generate && npx prisma db push --accept-data-loss"
echo "  - Database schema synced"

# ==========================================
# [8/11] Start Backend
# ==========================================
echo ""
echo -e "${YELLOW}[8/11] Starting backend...${NC}"
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
# [9/11] Start Frontend
# ==========================================
echo ""
echo -e "${YELLOW}[9/11] Starting frontend...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml --env-file .env.production up -d frontend

sleep 5
if ! docker ps -q -f name=guest-frontend-prod | grep -q .; then
    echo "  - Retrying frontend start..."
    docker start guest-frontend-prod >/dev/null 2>&1
    sleep 3
fi
echo "  - Frontend started"

# ==========================================
# [10/11] Verify NPM ↔ Frontend Connectivity
# ==========================================
echo ""
echo -e "${YELLOW}[10/11] Verifying NPM ↔ Frontend connectivity...${NC}"

# Check that frontend is reachable from NPM's network
if docker exec nginx-proxy-manager wget -q -O /dev/null --timeout=5 http://guest-frontend-prod:3000 2>/dev/null; then
    echo -e "  - NPM → Frontend: ${GREEN}Connected${NC}"
else
    echo -e "  - NPM → Frontend: ${YELLOW}Checking...${NC}"
    # Ensure frontend is on proxy-network
    if ! docker network inspect proxy-network --format '{{range .Containers}}{{.Name}} {{end}}' | grep -q "guest-frontend-prod"; then
        echo "  - Connecting frontend to proxy-network..."
        docker network connect proxy-network guest-frontend-prod 2>/dev/null || true
    fi
    sleep 3
    if docker exec nginx-proxy-manager wget -q -O /dev/null --timeout=5 http://guest-frontend-prod:3000 2>/dev/null; then
        echo -e "  - NPM → Frontend: ${GREEN}Connected (after retry)${NC}"
    else
        echo -e "  - NPM → Frontend: ${YELLOW}Not verified (configure in NPM dashboard)${NC}"
    fi
fi

# ==========================================
# [11/11] Final Verification
# ==========================================
echo ""
echo -e "${YELLOW}[11/11] Final verification...${NC}"
sleep 3

ALL_OK=1
NPM_STATUS="FAIL"
DB_STATUS="FAIL"
REDIS_STATUS="FAIL"
BACKEND_STATUS="FAIL"
FRONTEND_STATUS="FAIL"

if docker ps -q -f name=nginx-proxy-manager | grep -q .; then NPM_STATUS="OK"; else ALL_OK=0; fi
if docker ps -q -f name=guest-db-prod | grep -q .; then DB_STATUS="OK"; else ALL_OK=0; fi
if docker ps -q -f name=guest-redis-prod | grep -q .; then REDIS_STATUS="OK"; else ALL_OK=0; fi
if docker ps -q -f name=guest-backend-prod | grep -q .; then BACKEND_STATUS="OK"; else ALL_OK=0; fi
if docker ps -q -f name=guest-frontend-prod | grep -q .; then FRONTEND_STATUS="OK"; else ALL_OK=0; fi

echo ""
echo "================================================================"
echo "                    DEPLOYMENT STATUS"
echo "================================================================"
echo ""
echo "  Nginx Proxy Manager : [$NPM_STATUS]"
echo "  Database            : [$DB_STATUS]"
echo "  Redis               : [$REDIS_STATUS]"
echo "  Backend             : [$BACKEND_STATUS]"
echo "  Frontend            : [$FRONTEND_STATUS]"
echo ""

if [ $ALL_OK -eq 0 ]; then
    echo -e "${RED}[WARNING] Some services may have issues!${NC}"
    echo "Troubleshooting:"
    echo "  docker logs nginx-proxy-manager"
    echo "  docker logs guest-db-prod"
    echo "  docker logs guest-redis-prod"
    echo "  docker logs guest-backend-prod"
    echo "  docker logs guest-frontend-prod"
else
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}               ALL SERVICES DEPLOYED SUCCESSFULLY!              ${NC}"
    echo -e "${GREEN}================================================================${NC}"
fi

echo ""
echo "================================================================"
echo "                      ACCESS URLS"
echo "================================================================"
echo ""
echo -e "  ${CYAN}NPM Dashboard (Admin Proxy):${NC}"
echo "    http://$LOCAL_IP:81"
echo "    Default login: admin@example.com / changeme"
echo ""
echo -e "  ${CYAN}Direct Access (tanpa domain, HTTP):${NC}"
echo "    http://$LOCAL_IP:${FRONTEND_PORT:-3000}"
echo ""
echo -e "  ${CYAN}Via NPM (setelah konfigurasi proxy host):${NC}"
echo "    https://your-domain.com"
echo ""
echo "================================================================"
echo -e "  ${YELLOW}LANGKAH SELANJUTNYA:${NC}"
echo "  1. Buka NPM Dashboard: http://$LOCAL_IP:81"
echo "  2. Login → ganti password default"
echo "  3. Tambah Proxy Host:"
echo "     - Domain: your-domain.com"
echo "     - Forward: guest-frontend-prod:3000"
echo "     - SSL: Request Let's Encrypt certificate"
echo "  4. Tambah Advanced Config SSE (lihat panduan)"
echo "================================================================"
echo ""
echo " Deployment selesai."
