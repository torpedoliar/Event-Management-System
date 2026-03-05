@echo off
setlocal enabledelayedexpansion
title Docker Backup - Guest Registry

echo.
echo ================================================================
echo           DOCKER BACKUP - GUEST REGISTRY v1.0
echo     Backup images, database, uploads, dan konfigurasi
echo ================================================================
echo.

:: Set backup directory with timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set BACKUP_DATE=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_DIR=backup_%BACKUP_DATE%

echo [INFO] Membuat folder backup: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul

:: Check if containers are running
echo.
echo [1/6] Memeriksa status container...
docker ps --filter "name=guest" --format "table {{.Names}}\t{{.Status}}"
echo.

:: Backup Docker Images
echo [2/6] Menyimpan Docker images...
echo       - Backend image...
docker save registrasitamu-backend:latest -o "%BACKUP_DIR%\backend-image.tar"
if %errorlevel% neq 0 (
    echo [ERROR] Gagal backup backend image
) else (
    echo       [OK] Backend image saved
)

echo       - Frontend image...
docker save registrasitamu-frontend:latest -o "%BACKUP_DIR%\frontend-image.tar"
if %errorlevel% neq 0 (
    echo [ERROR] Gagal backup frontend image
) else (
    echo       [OK] Frontend image saved
)

echo       - PostgreSQL image...
docker save postgres:14-alpine -o "%BACKUP_DIR%\postgres-image.tar"
if %errorlevel% neq 0 (
    echo [ERROR] Gagal backup postgres image
) else (
    echo       [OK] PostgreSQL image saved
)

:: Backup Database
echo.
echo [3/6] Backup database PostgreSQL...
docker exec guest-db-prod pg_dump -U postgres -d guest_registry > "%BACKUP_DIR%\database.sql"
if %errorlevel% neq 0 (
    echo [ERROR] Gagal backup database
) else (
    echo       [OK] Database exported to database.sql
)

:: Backup Uploads Volume
echo.
echo [4/6] Backup uploads folder...
docker cp guest-backend-prod:/app/uploads "%BACKUP_DIR%\uploads" 2>nul
if %errorlevel% neq 0 (
    echo [WARN] Tidak ada uploads atau gagal backup
    mkdir "%BACKUP_DIR%\uploads" 2>nul
) else (
    echo       [OK] Uploads folder saved
)

:: Backup Configuration Files
echo.
echo [5/6] Backup konfigurasi...
copy ".env.production" "%BACKUP_DIR%\.env.production" >nul 2>&1
:: Use docker-compose.restore.yml for backup (uses pre-built images instead of build context)
if exist "docker-compose.restore.yml" (
    copy "docker-compose.restore.yml" "%BACKUP_DIR%\docker-compose.prod.yml" >nul 2>&1
) else (
    copy "docker-compose.prod.yml" "%BACKUP_DIR%\docker-compose.prod.yml" >nul 2>&1
)
copy "generate-ssl.bat" "%BACKUP_DIR%\generate-ssl.bat" >nul 2>&1
copy "renew-ssl.bat" "%BACKUP_DIR%\renew-ssl.bat" >nul 2>&1
xcopy "certs" "%BACKUP_DIR%\certs\" /E /I /Q >nul 2>&1
echo       [OK] Configuration files saved

:: Create restore script in backup folder
echo.
echo [6/6] Membuat script restore...

:: Copy the main restore-docker.bat to backup folder
copy "restore-docker.bat" "%BACKUP_DIR%\restore.bat" >nul 2>&1
if %errorlevel% neq 0 (
    echo       [WARN] Gagal copy restore-docker.bat, membuat restore.bat manual...
    :: Fallback: create a basic restore script
    (
        echo @echo off
        echo setlocal enabledelayedexpansion
        echo chcp 65001 ^>nul
        echo title Docker Restore - Guest Registry
        echo.
        echo echo ================================================================
        echo echo           DOCKER RESTORE - GUEST REGISTRY
        echo echo ================================================================
        echo echo.
        echo.
        echo echo [1/7] Loading Docker images...
        echo docker load -i backend-image.tar
        echo if %%errorlevel%% neq 0 echo [ERROR] Gagal load backend image
        echo docker load -i frontend-image.tar
        echo if %%errorlevel%% neq 0 echo [ERROR] Gagal load frontend image
        echo docker load -i postgres-image.tar
        echo if %%errorlevel%% neq 0 echo [ERROR] Gagal load postgres image
        echo echo       [OK] Images loaded
        echo.
        echo echo [2/7] Menyalin konfigurasi...
        echo copy ".env.production" "..\" ^>nul 2^>^&1
        echo copy "docker-compose.prod.yml" "..\" ^>nul 2^>^&1
        echo xcopy "certs" "..\certs\" /E /I /Q /Y ^>nul 2^>^&1
        echo echo       [OK] Configuration copied
        echo.
        echo echo [3/7] Menghentikan container lama...
        echo cd ..
        echo docker-compose -f docker-compose.prod.yml --env-file .env.production down 2^>nul
        echo.
        echo echo [4/7] Starting database...
        echo docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
        echo echo       Waiting 15 seconds...
        echo timeout /t 15 /nobreak ^>nul
        echo.
        echo echo [5/7] Restore database...
        echo cd "%%%%~dp0"
        echo docker exec -i guest-db-prod psql -U postgres -d guest_registry ^< database.sql
        echo cd ..
        echo echo       [OK] Database restored
        echo.
        echo echo [6/7] Starting backend...
        echo docker-compose -f docker-compose.prod.yml --env-file .env.production up -d backend
        echo timeout /t 20 /nobreak ^>nul
        echo cd "%%%%~dp0"
        echo if exist "uploads" docker cp uploads guest-backend-prod:/app/
        echo cd ..
        echo.
        echo echo [7/7] Starting frontend...
        echo docker-compose -f docker-compose.prod.yml --env-file .env.production up -d frontend
        echo timeout /t 5 /nobreak ^>nul
        echo.
        echo echo ================================================================
        echo echo                    RESTORE COMPLETE!
        echo echo ================================================================
        echo docker ps --filter "name=guest" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo pause
    ) > "%BACKUP_DIR%\restore.bat"
)

echo       [OK] restore.bat created

:: Show backup summary
echo.
echo ================================================================
echo                    BACKUP COMPLETE!
echo ================================================================
echo.
echo Folder backup: %BACKUP_DIR%
echo.
echo Isi folder:
dir "%BACKUP_DIR%" /b
echo.
echo ----------------------------------------------------------------
echo CARA MENGGUNAKAN:
echo 1. Copy folder "%BACKUP_DIR%" ke host tujuan
echo 2. Pastikan Docker sudah terinstall di host tujuan
echo 3. Buka folder backup dan jalankan "restore.bat"
echo ----------------------------------------------------------------
echo.
pause
