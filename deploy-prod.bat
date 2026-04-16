@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM ================================================================
REM     EVENT MANAGEMENT SYSTEM - Production Deployment with NPM
REM     Version: 2.0.0
REM     Windows / Batch Version
REM ================================================================

echo ================================================================
echo   EVENT MANAGEMENT SYSTEM + NGINX PROXY MANAGER Deployment
echo   Version 2.0.0
echo ================================================================
echo.

REM Get script directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

REM ==========================================
REM [0/11] Pre-flight Checks
REM ==========================================
echo [0/11] Pre-flight checks...

REM Check Docker
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker tidak terinstall!
    echo Panduan: https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)
echo   - Docker: OK

REM Check Docker Compose
set "DOCKER_COMPOSE_CMD="
docker compose version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "DOCKER_COMPOSE_CMD=docker compose"
) else (
    docker-compose version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "DOCKER_COMPOSE_CMD=docker-compose"
    ) else (
        echo [ERROR] Docker Compose tidak terinstall!
        pause
        exit /b 1
    )
)
echo   - Docker Compose: OK

REM Check required files
for %%f in ("docker-compose.prod.yml" "docker-compose.npm.yml" "apps\backend\Dockerfile" "apps\frontend\Dockerfile.prod") do (
    if not exist "%%~f" (
        echo [ERROR] File %%~f tidak ditemukan!
        pause
        exit /b 1
    )
)
echo   - Required files: OK

REM Check/Create .env.production
if not exist ".env.production" (
    if exist ".env.production.example" (
        echo   - Membuat .env.production dari template...
        copy /y .env.production.example .env.production >nul
    ) else (
        echo [ERROR] File .env.production tidak ditemukan!
        pause
        exit /b 1
    )
)
echo   - .env.production: OK

REM Load env vars
for /f "usebackq tokens=1,* delims==" %%a in (".env.production") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        if not "%%b"=="" set "%%a=%%b"
    )
)

REM Get local IP
set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "LOCAL_IP=%%i"
    set "LOCAL_IP=!LOCAL_IP: =!"
    goto :got_ip
)
:got_ip

echo   - Environment: OK

REM ==========================================
REM [1/11] Create Shared Network
REM ==========================================
echo.
echo [1/11] Creating shared Docker network...

docker network inspect npm-network >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   - Network 'npm-network' sudah ada
) else (
    docker network create npm-network
    echo   - Network 'npm-network' created
)

REM ==========================================
REM [2/11] Deploy Nginx Proxy Manager
REM ==========================================
echo.
echo [2/11] Deploying Nginx Proxy Manager...

%DOCKER_COMPOSE_CMD% -f docker-compose.npm.yml up -d
echo   - NPM container started/verified
echo   - Waiting for NPM to be ready...
set RETRY=0
:npm_wait
docker exec nginx-proxy-manager /bin/check-health >nul 2>&1
if %ERRORLEVEL% equ 0 goto npm_ready
set /a RETRY+=1
if !RETRY! gtr 30 (
    echo   - [WARNING] NPM health check timeout, continuing...
    goto npm_ready
)
timeout /t 2 /nobreak >nul
goto npm_wait
:npm_ready
echo   - NPM ready

REM ==========================================
REM [3/11] Optional Backup
REM ==========================================
echo.
echo [3/11] Checking for existing EMS deployment...

set "HAS_DB="
for /f %%i in ('docker ps -q -f name^=guest-db-prod') do set "HAS_DB=%%i"

if defined HAS_DB (
    echo   - Existing deployment found
    set /p "BACKUP=  Backup database sebelum deploy? (y/n): "
    if /i "!BACKUP!"=="y" (
        echo   - Creating backup...
        for /f "tokens=*" %%d in ('powershell -c "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set "DATETIME=%%d"
        set "BACKUP_FILE=backup_pre_deploy_!DATETIME!.sql"
        docker exec guest-db-prod pg_dump -U postgres -d guest_registry > "!BACKUP_FILE!" 2>nul
        if exist "!BACKUP_FILE!" (
            echo   - Backup saved: !BACKUP_FILE!
        ) else (
            echo   - [WARNING] Backup gagal, melanjutkan...
        )
    )
) else (
    echo   - No existing EMS deployment (fresh install^)
)

REM ==========================================
REM [4/11] Stop Existing EMS Containers
REM ==========================================
echo.
echo [4/11] Stopping existing EMS containers...
%DOCKER_COMPOSE_CMD% -f docker-compose.prod.yml --env-file .env.production down >nul 2>&1
echo   - EMS containers stopped

REM ==========================================
REM [5/11] Build EMS Containers
REM ==========================================
echo.
echo [5/11] Building EMS containers (may take 5-10 minutes)...
%DOCKER_COMPOSE_CMD% -f docker-compose.prod.yml --env-file .env.production build --no-cache
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Build failed!
    echo Troubleshooting:
    echo   1. Check internet connection
    echo   2. Check disk space: docker system df
    pause
    exit /b 1
)
echo   - Build completed successfully

REM ==========================================
REM [6/11] Start Database & Redis
REM ==========================================
echo.
echo [6/11] Starting database ^& Redis...
%DOCKER_COMPOSE_CMD% -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

echo   - Waiting for database...
set RETRY=0
:db_wait
docker exec guest-db-prod pg_isready -U postgres >nul 2>&1
if %ERRORLEVEL% equ 0 goto db_ready
set /a RETRY+=1
if !RETRY! gtr 60 (
    echo [ERROR] Database timeout!
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
goto db_wait
:db_ready
echo   - Database ready

echo   - Waiting for Redis...
set RETRY=0
:redis_wait
docker exec guest-redis-prod redis-cli ping >nul 2>&1
if %ERRORLEVEL% equ 0 goto redis_ready
set /a RETRY+=1
if !RETRY! gtr 30 (
    echo   - [WARNING] Redis timeout, continuing...
    goto redis_ready
)
timeout /t 2 /nobreak >nul
goto redis_wait
:redis_ready
echo   - Redis ready

REM ==========================================
REM [7/11] Database Initialization
REM ==========================================
echo.
echo [7/11] Prisma Database Initialization...
echo   - Pushing database schema...
%DOCKER_COMPOSE_CMD% -f docker-compose.prod.yml --env-file .env.production run --rm backend sh -c "npx prisma generate && npx prisma db push --accept-data-loss"
echo   - Database schema synced

REM ==========================================
REM [8/11] Start Backend
REM ==========================================
echo.
echo [8/11] Starting backend...
%DOCKER_COMPOSE_CMD% -f docker-compose.prod.yml --env-file .env.production up -d backend

echo   - Waiting for backend API...
set RETRY=0
:backend_wait
docker exec guest-backend-prod wget -q -O /dev/null http://127.0.0.1:4000/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 goto backend_ready
set /a RETRY+=1
if !RETRY! gtr 45 (
    echo   - [WARNING] Backend health check timeout
    for /f %%i in ('docker ps -q -f name^=guest-backend-prod') do set "BE_UP=%%i"
    if not defined BE_UP (
        echo [ERROR] Backend container failed!
        pause
        exit /b 1
    )
    echo   - Container running, continuing...
    goto backend_ready
)
timeout /t 2 /nobreak >nul
goto backend_wait
:backend_ready
echo   - Backend ready

REM ==========================================
REM [9/11] Start Frontend
REM ==========================================
echo.
echo [9/11] Starting frontend...
%DOCKER_COMPOSE_CMD% -f docker-compose.prod.yml --env-file .env.production up -d frontend

timeout /t 5 /nobreak >nul
for /f %%i in ('docker ps -q -f name^=guest-frontend-prod') do set "FE_UP=%%i"
if not defined FE_UP (
    echo   - Retrying frontend start...
    docker start guest-frontend-prod >nul 2>&1
    timeout /t 3 /nobreak >nul
)
echo   - Frontend started

REM ==========================================
REM [10/11] Verify NPM <-> Frontend Connectivity
REM ==========================================
echo.
echo [10/11] Verifying NPM - Frontend connectivity...

docker exec nginx-proxy-manager wget -q -O /dev/null --timeout=5 http://guest-frontend-prod:3000 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   - NPM - Frontend: Connected
) else (
    echo   - NPM - Frontend: Checking...
    docker network connect npm-network guest-frontend-prod >nul 2>&1
    timeout /t 3 /nobreak >nul
    docker exec nginx-proxy-manager wget -q -O /dev/null --timeout=5 http://guest-frontend-prod:3000 >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo   - NPM - Frontend: Connected (after retry^)
    ) else (
        echo   - NPM - Frontend: Not verified (configure in NPM dashboard^)
    )
)

REM ==========================================
REM [11/11] Final Verification
REM ==========================================
echo.
echo [11/11] Final verification...
timeout /t 3 /nobreak >nul

set "ALL_OK=1"
set "NPM_ST=FAIL"
set "DB_ST=FAIL"
set "REDIS_ST=FAIL"
set "BE_ST=FAIL"
set "FE_ST=FAIL"

for /f %%i in ('docker ps -q -f name^=nginx-proxy-manager') do set "NPM_ST=OK"
for /f %%i in ('docker ps -q -f name^=guest-db-prod') do set "DB_ST=OK"
for /f %%i in ('docker ps -q -f name^=guest-redis-prod') do set "REDIS_ST=OK"
for /f %%i in ('docker ps -q -f name^=guest-backend-prod') do set "BE_ST=OK"
for /f %%i in ('docker ps -q -f name^=guest-frontend-prod') do set "FE_ST=OK"

if "!NPM_ST!"=="FAIL" set "ALL_OK=0"
if "!DB_ST!"=="FAIL" set "ALL_OK=0"
if "!REDIS_ST!"=="FAIL" set "ALL_OK=0"
if "!BE_ST!"=="FAIL" set "ALL_OK=0"
if "!FE_ST!"=="FAIL" set "ALL_OK=0"

echo.
echo ================================================================
echo                     DEPLOYMENT STATUS
echo ================================================================
echo.
echo   Nginx Proxy Manager : [!NPM_ST!]
echo   Database            : [!DB_ST!]
echo   Redis               : [!REDIS_ST!]
echo   Backend             : [!BE_ST!]
echo   Frontend            : [!FE_ST!]
echo.

if "!ALL_OK!"=="0" (
    echo [WARNING] Some services may have issues!
    echo Troubleshooting:
    echo   docker logs nginx-proxy-manager
    echo   docker logs guest-db-prod
    echo   docker logs guest-redis-prod
    echo   docker logs guest-backend-prod
    echo   docker logs guest-frontend-prod
) else (
    echo ================================================================
    echo            ALL SERVICES DEPLOYED SUCCESSFULLY!
    echo ================================================================
)

echo.
echo ================================================================
echo                       ACCESS URLS
echo ================================================================
echo.
echo   NPM Dashboard (Admin Proxy^):
echo     http://!LOCAL_IP!:81
echo     Default login: admin@example.com / changeme
echo.
echo   Direct Access (tanpa domain, HTTP^):
echo     http://!LOCAL_IP!:!FRONTEND_PORT!
echo.
echo   Via NPM (setelah konfigurasi proxy host^):
echo     https://your-domain.com
echo.
echo ================================================================
echo   LANGKAH SELANJUTNYA:
echo   1. Buka NPM Dashboard: http://!LOCAL_IP!:81
echo   2. Login - ganti password default
echo   3. Tambah Proxy Host:
echo      - Domain: your-domain.com
echo      - Forward: guest-frontend-prod:3000
echo      - SSL: Request Let's Encrypt certificate
echo   4. Tambah Advanced Config SSE (lihat panduan^)
echo ================================================================
echo.
echo  Deployment selesai.
echo.
pause
