@echo off
echo ==========================================================
echo [ULTIMATE] Membuka Paksa Port 80 ^& 443 Lintas Semua Segmen
echo ==========================================================
echo.

:: Pengecekan Admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Script berjalan sebagai Administrator.
) else (
    echo [ERROR] Wajib Run as Administrator!
    pause
    exit /b 1
)

echo Sedang menimpa aturan Firewall Windows...
:: Menghapus aturan Nginx yang lama
netsh advfirewall firewall delete rule name="Nginx Proxy HTTP 80" >nul 2>&1
netsh advfirewall firewall delete rule name="Nginx Proxy HTTPS 443" >nul 2>&1

:: Menambahkan aturan SUPER yang memaksa buka dari SEMUA Segmen (RemoteIP=Any, EdgeTraversal=yes)
netsh advfirewall firewall add rule name="Nginx Proxy HTTP 80" dir=in action=allow protocol=TCP localport=80 remoteip=any profile=any EdgeTraversal=yes
netsh advfirewall firewall add rule name="Nginx Proxy HTTPS 443" dir=in action=allow protocol=TCP localport=443 remoteip=any profile=any EdgeTraversal=yes
netsh advfirewall firewall add rule name="NPM Admin Dashboard" dir=in action=allow protocol=TCP localport=81 remoteip=any profile=any EdgeTraversal=yes

:: Berjaga-jaga: Mengubah aturan Docker Desktop yang sering kali MENGUNCI akses hanya ke LocalSubnet
echo Mengoreksi proteksi rahasia Docker...
netsh advfirewall firewall set rule name="com.docker.backend.exe" new remoteip=any >nul 2>&1
netsh advfirewall firewall set rule name="vpnkit.exe" new remoteip=any >nul 2>&1

echo.
echo [SELESAI] Segala blokir internal OS terhadap Nginx Port 80/443 telah dihancurkan.
echo Silakan RESTART DOCKER / NGINX, lalu coba akses lagi.
pause
