@echo off
setlocal enabledelayedexpansion
title Production Deployment - Event Management System v1.3.0

echo.
echo ================================================================
echo     EVENT MANAGEMENT SYSTEM - Production Deployment v3.0
echo     Version: 1.3.0
echo     Windows OS Optimization
echo ================================================================
echo.

:: ==========================================
:: [A/9] PATH Verification & Admin Privileges
:: ==========================================
:: Check if running as administrator
net session >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [WARNING] Script ini direkomendasikan berjalan sebagai Administrator!
    echo           Beberapa perintah seperti symlink atau binding port 443 
    echo           berpotensi diblokir jika tidak memiliki hak akses.
    echo.
    set /p CONTINUE="Lanjutkan tanpa hak Administrator? (y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 1
)

:: Get script directory
set "ROOT=%~dp0"
cd /d "%ROOT%"

:: ==========================================
:: [0/9] Pre-flight Checks
:: ==========================================
echo [0/9] Melakukan Pre-flight checks...

:: Check Docker Engine
docker info >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Docker tidak berjalan atau tidak terinstall!
    echo         Pastikan Docker Desktop sudah menyala di background.
    echo.
    echo         Download Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo      - Docker Engine: OK

:: Check Docker Compose
set DOCKER_COMPOSE_CMD=
docker compose version >nul 2>&1
if !ERRORLEVEL! equ 0 (
    set DOCKER_COMPOSE_CMD=docker compose
) else (
    docker-compose --version >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set DOCKER_COMPOSE_CMD=docker-compose
    ) else (
        echo [ERROR] Plugin Docker Compose tidak terdeteksi!
        pause
        exit /b 1
    )
)
echo      - Docker Compose: OK (!DOCKER_COMPOSE_CMD!)

:: Check required files
for %%F in ("docker-compose.prod.yml" "apps\backend\Dockerfile" "apps\frontend\Dockerfile.prod") do (
    if not exist "%%~F" (
        echo [ERROR] File krusial "%%~F" tidak ditemukan!
        pause
        exit /b 1
    )
)
echo      - System Files: OK

:: Check/Create .env.production
if not exist ".env.production" (
    if exist ".env.production.example" (
        echo.
        echo [INFO] Membuat konfigurasi .env.production dari template...
        copy ".env.production.example" ".env.production" >nul
    ) else (
        echo [ERROR] File konfigurasi induk .env.production.example hilang!
        pause
        exit /b 1
    )
)
echo      - .env.production: OK

:: Load and validate variables (menggunakan file .env.production)
set ENV_VALID=1
for /f "usebackq tokens=1,* delims==" %%a in (".env.production") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        if not "%%a"=="" set "%%a=%%b"
    )
)

if "%DB_PASSWORD%"=="" set ENV_VALID=0
if "%DB_PASSWORD%"=="CHANGE_THIS_STRONG_PASSWORD" set ENV_VALID=0
if "%JWT_SECRET%"=="" set ENV_VALID=0
if "%JWT_SECRET%"=="CHANGE_THIS_TO_RANDOM_64_CHARACTER_STRING_FOR_SECURITY" set ENV_VALID=0
if "%ADMIN_PASSWORD%"=="" set ENV_VALID=0
if "%ADMIN_PASSWORD%"=="CHANGE_THIS_ADMIN_PASSWORD" set ENV_VALID=0

if !ENV_VALID!==0 (
    echo.
    echo ================================================================
    echo  [WARNING] File .env.production MASIH MENGGUNAKAN DEFAULT!
    echo ================================================================
    echo.
    echo  Sistem mendeteksi pengaturan keamanan default pabrik:
    echo    - DB_PASSWORD    : %DB_PASSWORD%
    echo    - JWT_SECRET     : %JWT_SECRET:~0,20%...
    echo    - ADMIN_PASSWORD : %ADMIN_PASSWORD%
    echo.
    echo  Dilarang menggunakan pengaturan pabrik di Production.
    echo  Harap edit file ".env.production" di direktori ini sebelum
    echo  menjalankan deployment.
    echo.
    set /p CONTINUE_DEPLOY="Tetap Nekat Lanjutkan Deploy? (y/n): "
    if /i not "!CONTINUE_DEPLOY!"=="y" (
        pause
        exit /b 1
    )
)
echo      - Environment Safety: OK

:: Get local IP address (Windows)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if not defined LOCAL_IP set "LOCAL_IP=%%b"
    )
)
if not defined LOCAL_IP set "LOCAL_IP=localhost"

:: ==========================================
:: [1/9] SSL Certificate Check/Generate
:: ==========================================
echo.
echo [1/9] Menginisiasi modul SSL (HTTPS)...
if not exist "certs" mkdir certs
if not exist "apps\backend\certs" mkdir apps\backend\certs
if not exist "apps\frontend\certs" mkdir apps\frontend\certs

if not exist "certs\server.key" (
    echo      - SSL belum ada, melakukan generate otomatis tipe Self-Signed...
    where openssl >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [WARNING] Command "OpenSSL" tidak terinstall di PC ini.
        echo.
        echo Opsi Anda:
        echo   1. Install OpenSSL Win32/64: https://slproweb.com/products/Win32OpenSSL.html
        echo   2. Jalankan secara manual
        echo   3. Terus Lanjut tanpa Setup HTTPS (Error di browser jika memaksa)
        echo.
        set /p CONTINUE="Lanjutkan tanpa sertifikat HTTPS? (y/n): "
        if /i not "!CONTINUE!"=="y" exit /b 1
        goto skip_ssl
    )
    
    openssl genrsa -out certs\server.key 2048 2>nul
    openssl req -new -x509 -key certs\server.key -out certs\server.crt -days 365 -subj "/C=ID/ST=Jakarta/L=Jakarta/O=EventManagement/CN=!LOCAL_IP!" 2>nul
    
    if not exist "certs\server.key" (
        echo [ERROR] Auto-generate SSL Gagal!
        pause
        exit /b 1
    )
    echo      - SSL TLS generated untuk domain/IP !LOCAL_IP!
)

:: Menyebarkan kopian sertifikat ke internal container mount point
copy /y certs\server.key apps\backend\certs\ >nul 2>&1
copy /y certs\server.crt apps\backend\certs\ >nul 2>&1
copy /y certs\server.key apps\frontend\certs\ >nul 2>&1
copy /y certs\server.crt apps\frontend\certs\ >nul 2>&1
echo      - SSL Binding: OK

:skip_ssl

:: ==========================================
:: [2/9] Backup Existing Database
:: ==========================================
echo.
echo [2/9] Pengecekan status inkremental deployment masa lalu...
docker ps -q -f name=guest-db-prod >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo      - Status: TERDETEKSI Database lama sedang berjalan
    set /p DO_BACKUP="Apakah ingin melakukan Backup data sebelum ditimpa? (y/n): "
    if /i "!DO_BACKUP!"=="y" (
        echo      - Mengekstrak data sql dump...
        for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
        set BACKUP_FILE=backup_pre_deploy_!datetime:~0,8!_!datetime:~8,6!.sql
        docker exec guest-db-prod pg_dump -U postgres -d guest_registry > "!BACKUP_FILE!" 2>nul
        if exist "!BACKUP_FILE!" (
            echo      - File berhasil diamankan: !BACKUP_FILE!
        ) else (
            echo      - [WARNING] Mekanisme backup database mengalami galat internal.
        )
    )
) else (
    echo      - Status: Clean Install (Belum ada container yang berjalan)
)

:: ==========================================
:: [3/9] Stop Existing Containers
:: ==========================================
echo.
echo [3/9] Menghentikan node aplikasi yang berjalan...
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production down >nul 2>&1
echo      - Node berhasil dihentikan.

:: ==========================================
:: [4/9] Build Containers
:: ==========================================
echo.
echo [4/9] Melakukan Build Ulang Infrastruktur... (Mohon tunggu 2-10 Menit)
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production build --no-cache
if !ERRORLEVEL! neq 0 (
    echo.
    echo [ERROR] Proses Build/Kompilasi Dockerflex gagal!
    echo         Periksa koneksi internet saat menginstall moduler *npm install* atau *apt-get*.
    pause
    exit /b 1
)
echo      - Build Kompilasi Image: Berhasil 100%

:: ==========================================
:: [5/9] Start Database Engine
:: ==========================================
echo.
echo [5/9] Mengaktifkan mesin PostgreSQL Engine...
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production up -d postgres

set RETRY=0
:wait_db
set /a RETRY+=1
if !RETRY! gtr 60 (
    echo [ERROR] Time-out menunggu database! (Lebih dari 2 menit)
    pause
    exit /b 1
)
docker exec guest-db-prod pg_isready -U postgres >nul 2>&1
if !ERRORLEVEL! neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait_db
)
echo      - PostgreSQL Online. (Respons di percobaan ke-!RETRY!)

:: ==========================================
:: [6/9] Database Prisma Schema Syncing
:: ==========================================
echo.
echo [6/9] Migrasi Skema Database ke versi 1.3...
echo      - Menginjeksi Model Prisma...
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production run --rm backend sh -c "npx prisma generate && npx prisma db push --accept-data-loss"
echo      - Sinkronisasi struktur Database Selesai.

:: ==========================================
:: [7/9] Start REST API Backend Node
:: ==========================================
echo.
echo [7/9] Menghidupkan Node Backend API (NestJS)...
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production up -d backend

set RETRY=0
:wait_backend
set /a RETRY+=1
if !RETRY! gtr 45 (
    echo      - [WARNING] Node Backend tidak merespon Health Check /api/health !
    docker ps -q -f name=guest-backend-prod | findstr . >nul
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Backend container gagal dihidupkan (Crash)!
        echo         Ketik perintah ini untuk debug: docker logs guest-backend-prod
        pause
        exit /b 1
    )
    echo      - Container dinyatakan berjalan walau tanpa respon HTTP, Lanjut ke step 8...
    goto start_frontend
)
docker exec guest-backend-prod wget -q -O /dev/null http://127.0.0.1:4000/api/health >nul 2>&1
if !ERRORLEVEL! neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait_backend
)
echo      - Node Backend API Online. (Siap melayani traffic SSE)

:: ==========================================
:: [8/9] Start Frontend Node (React Server)
:: ==========================================
:start_frontend
echo.
echo [8/9] Mengaktifkan UI Frontend React Server (Next.js)...
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production up -d frontend

timeout /t 5 /nobreak >nul
docker ps -q -f name=guest-frontend-prod | findstr . >nul
if !ERRORLEVEL! neq 0 (
    echo      - Status Container "Die". Sedang merestart paksa...
    docker start guest-frontend-prod >nul 2>&1
    timeout /t 3 /nobreak >nul
)
echo      - UI Web Server Online.

:: ==========================================
:: [9/9] Final Verification Output
:: ==========================================
echo.
echo [9/9] Verifikasi Terakhir...
timeout /t 3 /nobreak >nul

set ALL_OK=1
set DB_STATUS=FAIL
set BACKEND_STATUS=FAIL
set FRONTEND_STATUS=FAIL

docker ps -q -f name=guest-db-prod | findstr . >nul && set DB_STATUS=OK || set ALL_OK=0
docker ps -q -f name=guest-backend-prod | findstr . >nul && set BACKEND_STATUS=OK || set ALL_OK=0
docker ps -q -f name=guest-frontend-prod | findstr . >nul && set FRONTEND_STATUS=OK || set ALL_OK=0

echo.
echo ================================================================
echo                     DEPLOYMENT STATUS
echo ================================================================
echo.
echo   [ !DB_STATUS! ] Database  (Port Internal)
echo   [ !BACKEND_STATUS! ] Backend   (Port Internal HTTP)
echo   [ !FRONTEND_STATUS! ] Frontend  (Port Eksternal HTTPS)
echo.

if !ALL_OK!==0 (
    echo [WARNING] Minimal satu layanan berada dalam status Kritis!
    echo Cek kendalanya menggunakan docker log.
) else (
    echo ================================================================
    echo           EVENT MANAGEMENT SYSTEM v1.3.0 DEPLOYED!
    echo                 Status Semua Servis SEHAT.
    echo ================================================================
)

echo.
echo ================================================================
echo                       AKSES LINK SERVER
echo ================================================================
echo.
echo   Local Root:
echo     https://localhost:!FRONTEND_PORT!
echo.
echo   Intranet / Network:
echo     https://!LOCAL_IP!:!FRONTEND_PORT!
echo.
echo   Login Staff/Admin: 
echo     https://!LOCAL_IP!:!FRONTEND_PORT!/admin/login
echo.
echo ================================================================
echo                      AKUN DEFAULT
echo ================================================================
echo.
echo   Username : !ADMIN_USERNAME!
echo   Password : (lihat .env.production)
echo.

set /p OPEN_BROWSER="Jalankan antarmuka di Google Chrome/Default Browser sekarang? (y/n): "
if /i "!OPEN_BROWSER!"=="y" (
    start "" "https://localhost:!FRONTEND_PORT!/admin/login"
)

echo.
echo Skrip deploy telah selesai dengan sempurna.
pause >nul
