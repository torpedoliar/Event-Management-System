@echo off
echo ===================================================
echo Mematikan Layanan IIS (W3SVC) yang Memblokir Port 80
echo ===================================================
echo.

:: Mengecek apakah run as admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Script berjalan sebagai Administrator.
) else (
    echo [ERROR] Membutuhkan Akses Log In Administrator!
    echo Silakan tutup jendela ini, lalu Klik Kanan pada file "fix-iis-port80.bat" 
    echo dan pilih opsi "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo.
echo Menghentikan layanan IIS (World Wide Web Publishing Service)...
net stop w3svc /y >nul 2>&1

echo.
echo Menonaktifkan IIS dari Startup Otomatis...
sc config w3svc start= disabled >nul 2>&1

echo.
echo [SELESAI] Layanan IIS telah dimatikan secara permanen.
echo Port 80 dan 443 sekarang SEPENUHNYA menjadi milik NGINX Docker!
echo.
echo Silakan coba refresh website (domain) dari komputer segmen luar Anda.
echo.
pause
