@echo off
echo ===================================================
echo Membuka Akses Firewall untuk NGINX (Port 80 ^& 443)
echo ===================================================
echo.

:: Mengecek apakah run as admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Script berjalan sebagai Administrator.
) else (
    echo [ERROR] Membutuhkan Akses Log In Administrator!
    echo Silakan tutup jendela ini, lalu Klik Kanan pada file "fix-firewall.bat" 
    echo dan pilih opsi "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo Menambahkan Aturan Tembok Api (Firewall Rule) untuk lintas Segment...
netsh advfirewall firewall add rule name="Nginx Proxy HTTP 80" dir=in action=allow protocol=TCP localport=80 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Nginx Proxy HTTPS 443" dir=in action=allow protocol=TCP localport=443 profile=any >nul 2>&1

echo.
echo [SELESAI] Akses IP Lintas Segmen untuk Web Server (Domain) telah dibuka secara permanen!
echo Silakan coba refresh website registrasi tamu dari Komputer/Segment yang Berbeda.
echo.
pause
