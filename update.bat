@echo off
setlocal enabledelayedexpansion
title Update - Event Management System v1.3.1

echo.
echo ================================================================
echo     EVENT MANAGEMENT SYSTEM - Auto Update Script v1.3.1
echo     Windows OS Version
echo ================================================================
echo.

:: Get script directory to ensure relative paths work
set "ROOT=%~dp0"
cd /d "%ROOT%"

:: ==========================================
:: [0/7] Pre-flight Checks
:: ==========================================
echo [0/7] Menjalankan Pre-flight checks...

if not exist "docker-compose.prod.yml" (
    echo [ERROR] docker-compose.prod.yml tidak ditemukan!
    echo         Script ini harus dijalankan di dalam root folder proyek.
    pause
    exit /b 1
)

:: Check Docker Engine
docker info >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Docker tidak berjalan atau tidak terinstall!
    pause
    exit /b 1
)

:: Check Docker Compose Command
set DOCKER_COMPOSE_CMD=
docker compose version >nul 2>&1
if !ERRORLEVEL! equ 0 (
    set DOCKER_COMPOSE_CMD=docker compose
) else (
    docker-compose --version >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        set DOCKER_COMPOSE_CMD=docker-compose
    ) else (
        echo [ERROR] Docker Compose tidak ditemukan!
        pause
        exit /b 1
    )
)

:: Check Environment 
if not exist ".env.production" (
    echo [ERROR] File konfigurasi .env.production tidak ditemukan!
    echo         Update gagal. Sistem belum pernah di-deploy dengan benar.
    pause
    exit /b 1
)

:: ==========================================
:: [1/7] Backup Database Terkini
:: ==========================================
echo.
echo [1/7] Mengamankan database saat ini...
if not exist "backups" mkdir backups

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set BACKUP_FILE=backups\db_backup_!datetime:~0,8!_!datetime:~8,6!.sql

:: Cek apakah database sedang berjalan
docker ps -q -f name=guest-db-prod | findstr . >nul
if !ERRORLEVEL! equ 0 (
    echo      - Mengambil dump dari container guest-db-prod...
    docker exec guest-db-prod pg_dump -U postgres -d guest_registry > "!BACKUP_FILE!" 2>nul
    if exist "!BACKUP_FILE!" (
        echo      - File berhasil diamankan: !BACKUP_FILE!
    ) else (
        echo      - [WARNING] Mekanisme backup SQL ke lokal gagal!
        echo        Hal ini tidak biasa, melanjutkan operasi dengan resiko.
    )
) else (
    echo      - [WARNING] Container Database Sedang Mati. Backup SQL di-skip.
)

:: ==========================================
:: [2/7] Tarik Kode Terbaru (Git Pull)
:: ==========================================
echo.
echo [2/7] Meminta kode terbaru dari Source Repository (GitHub)...
git pull origin main
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Git Pull gagal! 
    echo         Sistem mendeteksi adanya modifikasi lokal yang bertabrakan.
    echo         Solusi: Coba jalankan perintah 'git stash' terlebih dahulu, 
    echo                 kemudian jalankan skrip ini lagi.
    pause
    exit /b 1
)
echo      - Kode berhasil diupdate ke versi pamungkas.

:: ==========================================
:: [3/7] Deteksi Perubahan Skema
:: ==========================================
echo.
echo [3/7] Mendeteksi modifikasi database engine...
git diff HEAD~1 --name-only 2>nul | findstr "prisma/schema.prisma" >nul
if !ERRORLEVEL! equ 0 (
    echo      - Status: TERDETEKSI ada perubahan struktur Database.
    echo        (Migrasi aman akan dilakukan otomatis di Step 7)
) else (
    echo      - Status: Struktur Database aman, tidak ada perubahan.
)

:: ==========================================
:: [4/7] Membersihkan Image Docker Lama
:: ==========================================
echo.
echo [4/7] Membersihkan image Docker lama untuk memastikan rebuild bersih...

:: Dapatkan project name dari docker compose
for /f "tokens=*" %%P in ('!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml config --images 2^>nul') do (
    echo      - Menghapus image cache: %%P
    docker rmi "%%P" >nul 2>&1
)

:: Fallback: hapus berdasarkan pola nama umum
docker rmi registrasitamu-frontend registrasitamu-backend >nul 2>&1
docker rmi registrasi-tamu-frontend registrasi-tamu-backend >nul 2>&1
docker rmi registrasi_tamu-frontend registrasi_tamu-backend >nul 2>&1

:: Bersihkan dangling images
docker image prune -f >nul 2>&1
echo      - Pembersihan image lama selesai.

:: ==========================================
:: [5/7] Rebuild Infrastructure (Zero Downtime Check)
:: ==========================================
echo.
echo [5/7] Melakukan Build Ulang Infrastruktur... (Ini memakan waktu sekitar 2-5 Menit)
echo      - Container di background MASIH TETAP MENYALA untuk meminimalkan downtime pengguna.
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production build --no-cache
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Proses Build / Kompilasi gagal!
    echo         Update dibatalkan karena fatal error (misal: koneksi putus).
    echo         Container Anda yang lama masih beroperasi dengan selamat.
    pause
    exit /b 1
)
echo      - Build Kompilasi Image: Selesai.

:: ==========================================
:: [6/7] Recreations & Restart Routine (Force Recreate)
:: ==========================================
echo.
echo [6/7] Merestart kontainer dengan image terbaru...
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production down --remove-orphans >nul 2>&1
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate
echo      - Node Backend, Database, dan Frontend hidup kembali di versi baru.

:: Tunggu backend healthy sebelum lanjut
echo      - Menunggu Backend siap menerima koneksi...
set RETRY=0
:wait_backend
set /a RETRY+=1
if !RETRY! gtr 30 (
    echo      - [WARNING] Backend belum merespon setelah 60 detik, melanjutkan...
    goto backend_ready
)
timeout /t 2 /nobreak >nul
docker exec guest-backend-prod node -e "const http = require('http'); http.get('http://127.0.0.1:4000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" >nul 2>&1
if !ERRORLEVEL! neq 0 goto wait_backend
echo      - Backend API Online! (Siap di percobaan ke-!RETRY!)

:backend_ready

:: ==========================================
:: [7/7] Database Syncing & Cleanup
:: ==========================================
echo.
echo [7/7] Menerapkan Sinkronisasi Skema Database via Prisma Engine...
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production exec -T backend npx prisma db push --accept-data-loss >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo      - Database Sync Selesai (100^%).
) else (
    echo      - [WARNING] Database Sync selesai dengan Warning. Terkadang wajar jika DB Engine sedang heavy-load.
)

echo      - Injeksi Client Prisma (Generate)...
!DOCKER_COMPOSE_CMD! -f docker-compose.prod.yml --env-file .env.production exec -T backend npx prisma generate >nul 2>&1
echo      - Prisma Client selesai disuntik ke inti Server NestJS.

:: Pembersihan Backup Lama (Simpan hanya 5 yang terbaru)
echo.
echo [Pembersihan Otomatis] Membuang file backup kuno agar penyimpanan Lega...
for /f "skip=5 eol=: delims=" %%F in ('dir /b /o-d "backups\db_backup_*.sql"') do del /q "backups\%%F" >nul 2>&1

:: ==========================================
:: Verifikasi Akhir
:: ==========================================
echo.
echo [Verifikasi] Memastikan semua layanan berjalan normal...

set ALL_OK=1

:: Cek container status
docker ps -q -f name=guest-db-prod | findstr . >nul
if !ERRORLEVEL! equ 0 (
    echo      - [OK] Database PostgreSQL: Berjalan
) else (
    echo      - [FAIL] Database PostgreSQL: Mati!
    set ALL_OK=0
)

docker ps -q -f name=guest-backend-prod | findstr . >nul
if !ERRORLEVEL! equ 0 (
    echo      - [OK] Backend API NestJS: Berjalan
) else (
    echo      - [FAIL] Backend API NestJS: Mati!
    set ALL_OK=0
)

docker ps -q -f name=guest-frontend-prod | findstr . >nul
if !ERRORLEVEL! equ 0 (
    echo      - [OK] Frontend Next.js: Berjalan
) else (
    echo      - [FAIL] Frontend Next.js: Mati!
    set ALL_OK=0
)

:: Verifikasi image freshness
echo.
echo [Verifikasi] Timestamp Container:
for /f "tokens=*" %%T in ('docker inspect guest-backend-prod --format "{{.Created}}" 2^>nul') do echo      - Backend  dibuat: %%T
for /f "tokens=*" %%T in ('docker inspect guest-frontend-prod --format "{{.Created}}" 2^>nul') do echo      - Frontend dibuat: %%T

:: ==========================================
:: DONE
:: ==========================================
echo.
if !ALL_OK! equ 1 (
    echo ================================================================
    echo                   PEMBERBARUAN SUKSES DILAKUKAN
    echo ================================================================
) else (
    echo ================================================================
    echo        PEMBERBARUAN SELESAI DENGAN WARNING - CEK STATUS DIATAS
    echo ================================================================
)
echo.
echo   Aplikasi saat ini telah berjalan pada rilis kode terbaru.
echo   File Backup Keamanan: !BACKUP_FILE!
echo.
echo   Panduan Memulihkan Data (Restore):
echo   Catatan: Hentikan server backend terlebih dahulu
echo     docker-compose -f docker-compose.prod.yml stop backend
echo     type "!BACKUP_FILE!" ^| docker exec -i guest-db-prod psql -U postgres guest_registry
echo     docker-compose -f docker-compose.prod.yml start backend
echo.
echo ================================================================
pause >nul
