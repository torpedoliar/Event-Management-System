<#
.SYNOPSIS
    Memverifikasi bahwa file dump PostgreSQL benar-benar dapat di-restore.

.DESCRIPTION
    Skrip ini melakukan DRILL RESTORE yang sebenarnya, bukan sekadar cek ukuran file:
      1. Menyalakan container PostgreSQL sementara (port acak, data sekali pakai).
      2. Me-restore dump ke container tersebut.
      3. Membandingkan jumlah baris setiap tabel dengan database sumber.
      4. Menghapus container sementara.

    Backup yang belum pernah berhasil di-restore BUKAN backup.

.EXAMPLE
    # Verifikasi backup produksi terhadap database yang sedang berjalan
    .\scripts\verify-backup.ps1 -DumpFile .\backup_20261027_193000\database.sql

.EXAMPLE
    # Verifikasi tanpa membandingkan ke sumber (hanya cek dump bisa di-restore)
    .\scripts\verify-backup.ps1 -DumpFile .\database.sql -SkipSourceComparison

.NOTES
    Exit code 0 = PASS, 1 = FAIL. Aman dijalankan berkali-kali; container selalu dibersihkan.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$DumpFile,

    # Container database sumber (untuk pembanding jumlah baris)
    [string]$SourceContainer = 'guest-db-prod',

    [string]$DbUser = 'postgres',
    [string]$DbName = 'guest_registry',

    # Image PostgreSQL untuk container drill
    [string]$Image = 'postgres:14-alpine',

    # Lewati perbandingan ke sumber (dipakai bila sumber sudah tidak ada)
    [switch]$SkipSourceComparison,

    # Izinkan dump tanpa penanda akhir pg_dump (mis. dump dibuat dengan --no-comments)
    [switch]$AllowIncompleteMarker,

    # Batas waktu tunggu container siap (detik)
    [int]$ReadyTimeoutSeconds = 90
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$script:TempContainer = $null

function Write-Step    { param([string]$m) Write-Host "  $m" -ForegroundColor Cyan }
function Write-Ok      { param([string]$m) Write-Host "  [OK]   $m" -ForegroundColor Green }
function Write-Warn    { param([string]$m) Write-Host "  [WARN] $m" -ForegroundColor Yellow }
function Write-Fail    { param([string]$m) Write-Host "  [FAIL] $m" -ForegroundColor Red }

function Invoke-Docker {
    <# Menjalankan docker dan mengembalikan stdout; melempar error bila exit code != 0 #>
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )
    $out = & docker @Arguments 2>&1
    $code = $LASTEXITCODE
    if ($code -ne 0 -and -not $AllowFailure) {
        throw "docker $($Arguments -join ' ') gagal (exit $code):`n$($out -join "`n")"
    }
    return @{ Output = ($out -join "`n").Trim(); Code = $code }
}

function Get-TableRowCounts {
    <# Mengembalikan hashtable nama-tabel -> jumlah baris (exact count) #>
    param(
        [Parameter(Mandatory)][string]$Container,
        [Parameter(Mandatory)][string]$User,
        [Parameter(Mandatory)][string]$Database
    )

    $listSql = "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
    $tablesResult = Invoke-Docker -Arguments @('exec', $Container, 'psql', '-U', $User, '-d', $Database, '-tAc', $listSql)
    $tables = $tablesResult.Output -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

    $counts = @{}
    foreach ($t in $tables) {
        # Identitas tabel diambil dari pg_tables sehingga aman dari injeksi;
        # tetap di-quote karena banyak nama tabel memakai huruf besar (mis. "Guest").
        $countSql = 'SELECT count(*) FROM "' + $t.Replace('"', '""') + '";'
        $r = Invoke-Docker -Arguments @('exec', $Container, 'psql', '-U', $User, '-d', $Database, '-tAc', $countSql)
        $counts[$t] = [int64]($r.Output.Trim())
    }
    return $counts
}

function Wait-ContainerReady {
    param([string]$Container, [string]$User, [int]$TimeoutSeconds)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $r = Invoke-Docker -Arguments @('exec', $Container, 'pg_isready', '-U', $User) -AllowFailure
        if ($r.Code -eq 0) { return $true }
        Start-Sleep -Milliseconds 800
    }
    return $false
}

# ---------------------------------------------------------------- pre-flight
Write-Host ""
Write-Host "================================================================" -ForegroundColor White
Write-Host "        VERIFIKASI BACKUP - DRILL RESTORE" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor White
Write-Host ""

Write-Step "Memeriksa prasyarat..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker tidak ditemukan di PATH."
    exit 1
}

$dumpPath = (Resolve-Path -LiteralPath $DumpFile -ErrorAction SilentlyContinue)
if (-not $dumpPath) {
    Write-Fail "File dump tidak ditemukan: $DumpFile"
    exit 1
}
$dumpPath = $dumpPath.Path
$dumpInfo = Get-Item -LiteralPath $dumpPath

if ($dumpInfo.Length -eq 0) {
    Write-Fail "File dump kosong (0 byte): $dumpPath"
    exit 1
}

Write-Ok "Dump: $dumpPath ($([math]::Round($dumpInfo.Length / 1KB, 1)) KB)"

# Deteksi dump kosong secara semantik: pg_dump yang gagal sering menghasilkan
# file kecil berisi pesan error, bukan SQL.
$head = Get-Content -LiteralPath $dumpPath -TotalCount 60 -ErrorAction SilentlyContinue
$hasSqlMarkers = ($head -match 'PostgreSQL database dump|CREATE TABLE|SET statement_timeout|pg_catalog' | Measure-Object).Count -gt 0
if (-not $hasSqlMarkers) {
    Write-Fail "File tidak terlihat seperti dump SQL yang valid (tidak ditemukan penanda pg_dump)."
    Write-Step "10 baris pertama:"
    $head | Select-Object -First 10 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    exit 1
}
Write-Ok "Struktur dump SQL terdeteksi."

# --- Integritas struktural -------------------------------------------------
# Dump yang terpotong (koneksi putus / disk penuh / container mati di tengah
# proses) tetap akan berhasil di-restore SEBAGIAN dan psql tetap keluar dengan
# kode 0. Tanpa pemeriksaan ini, backup rusak akan dilaporkan PASS.
Write-Step "Memeriksa integritas struktural dump..."

if (-not $AllowIncompleteMarker) {
    $tail = Get-Content -LiteralPath $dumpPath -Tail 40 -ErrorAction SilentlyContinue
    $hasCompletion = (($tail -match 'PostgreSQL database dump complete') | Measure-Object).Count -gt 0
    if (-not $hasCompletion) {
        Write-Fail "Penanda akhir pg_dump tidak ditemukan - dump kemungkinan TERPOTONG."
        Write-Step "Dump yang tidak lengkap dapat restore sebagian tanpa error,"
        Write-Step "sehingga tampak berhasil padahal data sudah hilang."
        Write-Step "Gunakan -AllowIncompleteMarker hanya jika dump memang dibuat dengan --no-comments."
        exit 1
    }
    Write-Ok "Penanda akhir pg_dump ditemukan."
}

# Setiap blok 'COPY ... FROM stdin;' harus ditutup tepat satu baris '\.'
# Selisih jumlah berarti ada blok data yang terputus di tengah.
$copyStarts = @(Select-String -LiteralPath $dumpPath -Pattern '^COPY .+ FROM stdin;$' -AllMatches).Count
$copyEnds = @(Select-String -LiteralPath $dumpPath -Pattern '^\\\.\s*$' -AllMatches).Count
if ($copyStarts -ne $copyEnds) {
    Write-Fail "Blok data tidak seimbang: $copyStarts blok COPY dibuka, $copyEnds ditutup."
    Write-Step "Menandakan ada tabel yang datanya terpotong di tengah."
    exit 1
}
Write-Ok "Blok data seimbang ($copyStarts blok COPY)."

# ---------------------------------------------------------------- drill
$tempName = "guest-verify-" + ([guid]::NewGuid().ToString('N').Substring(0, 8))
$tempPass = [guid]::NewGuid().ToString('N')
$restoreOk = $false
$failureReason = $null
$sourceCounts = $null
$targetCounts = $null

try {
    Write-Host ""
    Write-Step "Menyalakan container sementara: $tempName"

    Invoke-Docker -Arguments @(
        'run', '-d', '--name', $tempName,
        '-e', "POSTGRES_PASSWORD=$tempPass",
        '-e', "POSTGRES_USER=$DbUser",
        '-e', "POSTGRES_DB=$DbName",
        $Image
    ) | Out-Null
    $script:TempContainer = $tempName

    if (-not (Wait-ContainerReady -Container $tempName -User $DbUser -TimeoutSeconds $ReadyTimeoutSeconds)) {
        throw "Container tidak siap dalam $ReadyTimeoutSeconds detik."
    }
    Write-Ok "Container siap."

    # pg_dump plain-format harus dijalankan lewat psql dengan ON_ERROR_STOP=1,
    # jika tidak, error di tengah restore akan diabaikan dan drill jadi palsu.
    Write-Step "Me-restore dump ke container sementara..."
    Invoke-Docker -Arguments @('cp', $dumpPath, "${tempName}:/tmp/restore.sql") | Out-Null
    $restore = Invoke-Docker -Arguments @(
        'exec', $tempName,
        'psql', '-U', $DbUser, '-d', $DbName,
        '-v', 'ON_ERROR_STOP=1', '-q', '-f', '/tmp/restore.sql'
    ) -AllowFailure

    if ($restore.Code -ne 0) {
        $failureReason = "psql keluar dengan kode $($restore.Code)."
        $tail = ($restore.Output -split "`n" | Select-Object -Last 15) -join "`n"
        Write-Fail $failureReason
        Write-Host $tail -ForegroundColor DarkGray
        throw $failureReason
    }
    Write-Ok "Dump berhasil di-restore tanpa error."

    # ------------------------------------------------------------ bandingkan
    Write-Step "Menghitung jumlah baris pada database hasil restore..."
    $targetCounts = Get-TableRowCounts -Container $tempName -User $DbUser -Database $DbName
    Write-Ok "$($targetCounts.Count) tabel ditemukan."

    if (-not $SkipSourceComparison) {
        $srcRunning = (Invoke-Docker -Arguments @('ps', '--filter', "name=^${SourceContainer}$", '--format', '{{.Names}}') -AllowFailure).Output
        if ($srcRunning -eq $SourceContainer) {
            Write-Step "Membandingkan dengan sumber ($SourceContainer)..."
            $sourceCounts = Get-TableRowCounts -Container $SourceContainer -User $DbUser -Database $DbName

            $mismatch = @()
            $allTables = @($sourceCounts.Keys) + @($targetCounts.Keys) | Sort-Object -Unique
            foreach ($t in $allTables) {
                $src = if ($sourceCounts.ContainsKey($t)) { $sourceCounts[$t] } else { $null }
                $dst = if ($targetCounts.ContainsKey($t)) { $targetCounts[$t] } else { $null }
                if ($src -ne $dst) { $mismatch += [pscustomobject]@{ Tabel = $t; Sumber = $src; Restore = $dst } }
            }

            if ($mismatch.Count -gt 0) {
                Write-Fail "Ditemukan $($mismatch.Count) tabel dengan jumlah baris berbeda:"
                $mismatch | Format-Table -AutoSize | Out-String | Write-Host
                throw "Jumlah baris tidak cocok antara dump dan database sumber."
            }
            Write-Ok "Semua $($allTables.Count) tabel cocok dengan sumber."
        }
        else {
            Write-Warn "Container sumber '$SourceContainer' tidak berjalan - perbandingan dilewati."
        }
    }

    $restoreOk = $true
}
catch {
    if (-not $failureReason) { $failureReason = $_.Exception.Message }
    if (-not $restoreOk) { Write-Fail $failureReason }
}
finally {
    if ($script:TempContainer) {
        Write-Host ""
        Write-Step "Membersihkan container sementara..."
        Invoke-Docker -Arguments @('rm', '-f', $script:TempContainer) -AllowFailure | Out-Null
        Write-Ok "Container dihapus."
    }
}

# ---------------------------------------------------------------- hasil
Write-Host ""
Write-Host "================================================================" -ForegroundColor White
if ($restoreOk) {
    Write-Host "   HASIL: PASS - Backup terbukti dapat di-restore." -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor White
    if ($targetCounts) {
        Write-Host ""
        Write-Host "  Tabel utama:" -ForegroundColor White
        $show = @('Event', 'Guest', 'GuestCheckin', 'Prize', 'Souvenir', 'AdminUser')
        foreach ($t in $show) {
            if ($targetCounts.ContainsKey($t)) {
                Write-Host ("    {0,-16} {1,10} baris" -f $t, $targetCounts[$t]) -ForegroundColor Gray
            }
        }
    }
    Write-Host ""
    exit 0
}
else {
    Write-Host "   HASIL: FAIL - Backup TIDAK dapat diandalkan." -ForegroundColor Red
    Write-Host "================================================================" -ForegroundColor White
    Write-Host ""
    Write-Host "  Jangan mengandalkan backup ini. Periksa penyebab di atas," -ForegroundColor Yellow
    Write-Host "  lalu buat backup baru sebelum melakukan perubahan apa pun." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
