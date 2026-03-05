@echo off
setlocal enabledelayedexpansion
title Docker Restore - Guest Registry

echo.
echo ================================================================
echo           DOCKER RESTORE - GUEST REGISTRY v1.0
echo     Restore images, database, uploads, dan konfigurasi
echo ================================================================
echo.

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker tidak ditemukan. Install Docker terlebih dahulu.
    pause
    exit /b 1
)

REM Check required files
echo [0/7] Memeriksa file backup...
set MISSING=0

if not exist "backend-image.tar" (
    echo       [MISSING] backend-image.tar
    set MISSING=1
)
if not exist "frontend-image.tar" (
    echo       [MISSING] frontend-image.tar
    set MISSING=1
)
if not exist "postgres-image.tar" (
    echo       [MISSING] postgres-image.tar
    set MISSING=1
)
if not exist "database.sql" (
    echo       [MISSING] database.sql
    set MISSING=1
)
if not exist ".env.production" (
    echo       [MISSING] .env.production
    set MISSING=1
)
if not exist "docker-compose.prod.yml" (
    echo       [MISSING] docker-compose.prod.yml
    set MISSING=1
)

if %MISSING%==1 (
    echo.
    echo [ERROR] File backup tidak lengkap. Pastikan semua file ada.
    pause
    exit /b 1
)
echo       [OK] Semua file backup tersedia
echo.

REM Confirm restore
echo ================================================================
echo PERINGATAN: Proses ini akan mengganti data yang ada!
echo ================================================================
echo.
set /p CONFIRM="Lanjutkan restore? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Restore dibatalkan.
    pause
    exit /b 0
)
echo.

REM Load Docker Images
echo [1/7] Loading Docker images...
echo       - Backend image...
docker load -i backend-image.tar
if %errorlevel% neq 0 (
    echo       [ERROR] Gagal load backend image
)

echo       - Frontend image...
docker load -i frontend-image.tar
if %errorlevel% neq 0 (
    echo       [ERROR] Gagal load frontend image
)

echo       - PostgreSQL image...
docker load -i postgres-image.tar
if %errorlevel% neq 0 (
    echo       [ERROR] Gagal load postgres image
)
echo       [OK] Images loaded
echo.

REM Copy configuration to parent directory
echo [2/7] Menyalin konfigurasi...
copy ".env.production" "..\" >nul 2>&1
copy "docker-compose.prod.yml" "..\" >nul 2>&1
if exist "certs" (
    xcopy "certs" "..\certs\" /E /I /Q /Y >nul 2>&1
)
if exist "generate-ssl.bat" (
    copy "generate-ssl.bat" "..\" >nul 2>&1
)
echo       [OK] Configuration copied to parent directory
echo.

REM Change to parent directory
cd ..

REM Check if SSL certs exist, if not generate them
if not exist "certs\server.key" (
    echo [2.5/7] Generating SSL certificates...
    if exist "generate-ssl.bat" (
        call generate-ssl.bat
    ) else (
        mkdir certs 2>nul
        echo       [WARN] SSL certificates not found. Generate manually or copy from backup.
    )
)

REM Stop existing containers if any
echo [3/7] Menghentikan container lama (jika ada)...
docker-compose -f docker-compose.prod.yml --env-file .env.production down 2>nul
echo       [OK] Containers stopped
echo.

REM Start database
echo [4/7] Starting database container...
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
echo       Menunggu database ready (15 detik)...
timeout /t 15 /nobreak >nul

REM Check database health
docker exec guest-db-prod pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo       Menunggu tambahan 10 detik...
    timeout /t 10 /nobreak >nul
)
echo       [OK] Database ready
echo.

REM Restore database
echo [5/7] Restore database...
cd "%~dp0"
docker exec -i guest-db-prod psql -U postgres -d guest_registry < database.sql
if %errorlevel% neq 0 (
    echo       [WARN] Ada error saat restore, kemungkinan database sudah terisi
) else (
    echo       [OK] Database restored
)
cd ..
echo.

REM Start backend
echo [6/7] Starting backend container...
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d backend
echo       Menunggu backend ready (20 detik)...
timeout /t 20 /nobreak >nul

REM Restore uploads
cd "%~dp0"
if exist "uploads" (
    echo       Restoring uploads...
    docker cp uploads guest-backend-prod:/app/
    echo       [OK] Uploads restored
)
cd ..
echo.

REM Start frontend
echo [7/7] Starting frontend container...
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d frontend
timeout /t 5 /nobreak >nul
echo       [OK] Frontend started
echo.

REM Show final status
echo ================================================================
echo                    RESTORE SELESAI!
echo ================================================================
echo.
docker ps --filter "name=guest" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo ================================================================
pause
