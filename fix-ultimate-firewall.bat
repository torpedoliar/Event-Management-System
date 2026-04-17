@echo off
echo ==========================================================
echo [ULTIMATE] Container Engine Firewall Fix (Port 80/443)
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

:: Menambahkan aturan Port Global (Universal untuk NPM)
netsh advfirewall firewall add rule name="Nginx Proxy HTTP 80" dir=in action=allow protocol=TCP localport=80 remoteip=any profile=any edge=yes
netsh advfirewall firewall add rule name="Nginx Proxy HTTPS 443" dir=in action=allow protocol=TCP localport=443 remoteip=any profile=any edge=yes
netsh advfirewall firewall add rule name="NPM Admin Dashboard" dir=in action=allow protocol=TCP localport=81 remoteip=any profile=any edge=yes

:: Proteksi Khusus Docker Desktop
echo Mengoreksi proteksi Docker Desktop...
netsh advfirewall firewall set rule name="com.docker.backend.exe" new remoteip=any >nul 2>&1
netsh advfirewall firewall set rule name="vpnkit.exe" new remoteip=any >nul 2>&1

:: Proteksi Khusus Rancher Desktop / WSL2
echo Mengoreksi proteksi Rancher Desktop ^& WSL...
netsh advfirewall firewall set rule name="Rancher Desktop" new remoteip=any >nul 2>&1
netsh advfirewall firewall set rule name="rancher-desktop" new remoteip=any >nul 2>&1
netsh advfirewall firewall set rule name="Windows Subsystem for Linux" new remoteip=any >nul 2>&1

echo.
echo [SELESAI] Segala blokir internal OS terhadap Nginx Port 80/443 telah dihancurkan.
echo Script ini sekarang mendukung Docker Desktop dan Rancher Desktop.
echo Silakan RESTART CONTAINER ENGINE (Docker/Rancher), lalu coba akses lagi.
pause
