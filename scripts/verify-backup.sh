#!/usr/bin/env bash
#
# verify-backup.sh - Membuktikan bahwa file dump PostgreSQL benar-benar dapat di-restore.
#
# Melakukan DRILL RESTORE sungguhan:
#   1. Menyalakan container PostgreSQL sementara (port acak, data sekali pakai)
#   2. Memeriksa integritas struktural dump (deteksi file terpotong)
#   3. Me-restore dump dengan ON_ERROR_STOP=1
#   4. Membandingkan jumlah baris setiap tabel dengan database sumber
#   5. Menghapus container sementara
#
# Backup yang belum pernah berhasil di-restore BUKAN backup.
#
# Pemakaian:
#   ./scripts/verify-backup.sh backup_20261027_193000/database.sql
#   ./scripts/verify-backup.sh dump.sql --skip-compare
#   ./scripts/verify-backup.sh dump.sql --source guest-db-prod --user postgres --db guest_registry
#
# Exit code: 0 = PASS, 1 = FAIL
#
set -Eeuo pipefail

DUMP_FILE=""
SOURCE_CONTAINER="guest-db-prod"
DB_USER="postgres"
DB_NAME="guest_registry"
IMAGE="postgres:14-alpine"
SKIP_COMPARE=0
ALLOW_INCOMPLETE=0
READY_TIMEOUT=90

TEMP_CONTAINER=""
PASS=1
FAIL_REASON=""

c_ok()   { printf '  \033[32m[OK]\033[0m   %s\n' "$*"; }
c_warn() { printf '  \033[33m[WARN]\033[0m %s\n' "$*"; }
c_fail() { printf '  \033[31m[FAIL]\033[0m %s\n' "$*"; }
c_step() { printf '  %s\n' "$*"; }

usage() {
  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

cleanup() {
  if [[ -n "$TEMP_CONTAINER" ]]; then
    printf '\n'
    c_step "Membersihkan container sementara..."
    docker rm -f "$TEMP_CONTAINER" >/dev/null 2>&1 || true
    c_ok "Container dihapus."
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------- argumen
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)            SOURCE_CONTAINER="$2"; shift 2 ;;
    --user)              DB_USER="$2";          shift 2 ;;
    --db)                DB_NAME="$2";          shift 2 ;;
    --image)             IMAGE="$2";            shift 2 ;;
    --skip-compare)      SKIP_COMPARE=1;        shift ;;
    --allow-incomplete)  ALLOW_INCOMPLETE=1;    shift ;;
    -h|--help)           usage 0 ;;
    -*)                  echo "Opsi tidak dikenal: $1" >&2; usage 1 ;;
    *)                   DUMP_FILE="$1";        shift ;;
  esac
done

[[ -z "$DUMP_FILE" ]] && { echo "Error: file dump wajib diberikan." >&2; usage 1; }

echo ""
echo "================================================================"
echo "        VERIFIKASI BACKUP - DRILL RESTORE"
echo "================================================================"
echo ""

# ---------------------------------------------------------------- pre-flight
c_step "Memeriksa prasyarat..."

command -v docker >/dev/null 2>&1 || { c_fail "Docker tidak ditemukan di PATH."; exit 1; }

[[ -f "$DUMP_FILE" ]] || { c_fail "File dump tidak ditemukan: $DUMP_FILE"; exit 1; }
[[ -s "$DUMP_FILE" ]] || { c_fail "File dump kosong (0 byte): $DUMP_FILE"; exit 1; }

DUMP_SIZE=$(wc -c < "$DUMP_FILE" | tr -d ' ')
c_ok "Dump: $DUMP_FILE ($(awk "BEGIN{printf \"%.1f\", $DUMP_SIZE/1024}") KB)"

# pg_dump yang gagal sering menghasilkan file kecil berisi pesan error, bukan SQL.
if ! head -60 "$DUMP_FILE" | grep -qE 'PostgreSQL database dump|CREATE TABLE|SET statement_timeout|pg_catalog'; then
  c_fail "File tidak terlihat seperti dump SQL yang valid (tidak ditemukan penanda pg_dump)."
  c_step "10 baris pertama:"
  head -10 "$DUMP_FILE" | sed 's/^/      /'
  exit 1
fi
c_ok "Struktur dump SQL terdeteksi."

# --- Integritas struktural -------------------------------------------------
# Dump yang terpotong tetap dapat restore SEBAGIAN dan psql tetap keluar dengan
# kode 0. Tanpa pemeriksaan ini, backup rusak dilaporkan PASS.
c_step "Memeriksa integritas struktural dump..."

if [[ "$ALLOW_INCOMPLETE" -eq 0 ]]; then
  if ! tail -40 "$DUMP_FILE" | grep -q 'PostgreSQL database dump complete'; then
    c_fail "Penanda akhir pg_dump tidak ditemukan - dump kemungkinan TERPOTONG."
    c_step "Dump tidak lengkap dapat restore sebagian tanpa error,"
    c_step "sehingga tampak berhasil padahal data sudah hilang."
    c_step "Gunakan --allow-incomplete hanya jika dump dibuat dengan --no-comments."
    exit 1
  fi
  c_ok "Penanda akhir pg_dump ditemukan."
fi

COPY_STARTS=$(grep -c '^COPY .\+ FROM stdin;$' "$DUMP_FILE" || true)
COPY_ENDS=$(grep -c '^\\\.\s*$' "$DUMP_FILE" || true)
if [[ "$COPY_STARTS" -ne "$COPY_ENDS" ]]; then
  c_fail "Blok data tidak seimbang: $COPY_STARTS blok COPY dibuka, $COPY_ENDS ditutup."
  c_step "Menandakan ada tabel yang datanya terpotong di tengah."
  exit 1
fi
c_ok "Blok data seimbang ($COPY_STARTS blok COPY)."

# ---------------------------------------------------------------- drill
TEMP_CONTAINER="guest-verify-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' \n')"
TEMP_PASS="$(head -c16 /dev/urandom | od -An -tx1 | tr -d ' \n')"

echo ""
c_step "Menyalakan container sementara: $TEMP_CONTAINER"

docker run -d --name "$TEMP_CONTAINER" \
  -e "POSTGRES_PASSWORD=$TEMP_PASS" \
  -e "POSTGRES_USER=$DB_USER" \
  -e "POSTGRES_DB=$DB_NAME" \
  "$IMAGE" >/dev/null

READY=0
for _ in $(seq 1 "$READY_TIMEOUT"); do
  if docker exec "$TEMP_CONTAINER" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
    READY=1; break
  fi
  sleep 1
done
[[ "$READY" -eq 1 ]] || { c_fail "Container tidak siap dalam ${READY_TIMEOUT}s."; exit 1; }
c_ok "Container siap."

c_step "Me-restore dump ke container sementara..."
docker cp "$DUMP_FILE" "${TEMP_CONTAINER}:/tmp/restore.sql" >/dev/null

if ! docker exec "$TEMP_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
      -v ON_ERROR_STOP=1 -q -f /tmp/restore.sql > /tmp/verify_restore.log 2>&1; then
  c_fail "Restore gagal - psql melaporkan error."
  tail -15 /tmp/verify_restore.log | sed 's/^/      /'
  exit 1
fi
c_ok "Dump berhasil di-restore tanpa error."

# ---------------------------------------------------------------- hitung baris
count_tables() {
  local container="$1"
  docker exec "$container" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
}

count_rows() {
  local container="$1" table="$2"
  local escaped="${table//\"/\"\"}"
  docker exec "$container" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT count(*) FROM \"$escaped\";" | tr -d ' '
}

c_step "Menghitung jumlah baris pada database hasil restore..."
mapfile -t TABLES < <(count_tables "$TEMP_CONTAINER")
c_ok "${#TABLES[@]} tabel ditemukan."

if [[ "$SKIP_COMPARE" -eq 0 ]]; then
  if docker ps --filter "name=^${SOURCE_CONTAINER}$" --format '{{.Names}}' | grep -qx "$SOURCE_CONTAINER"; then
    c_step "Membandingkan dengan sumber ($SOURCE_CONTAINER)..."
    MISMATCH=0
    MISMATCH_ROWS=""

    mapfile -t SRC_TABLES < <(count_tables "$SOURCE_CONTAINER")
    # Gabungan nama tabel dari sumber dan hasil restore
    mapfile -t ALL_TABLES < <(printf '%s\n' "${TABLES[@]}" "${SRC_TABLES[@]}" | sort -u)

    for t in "${ALL_TABLES[@]}"; do
      [[ -z "$t" ]] && continue
      src="-"; dst="-"
      if printf '%s\n' "${SRC_TABLES[@]}" | grep -qxF "$t"; then src=$(count_rows "$SOURCE_CONTAINER" "$t"); fi
      if printf '%s\n' "${TABLES[@]}"     | grep -qxF "$t"; then dst=$(count_rows "$TEMP_CONTAINER" "$t"); fi
      if [[ "$src" != "$dst" ]]; then
        MISMATCH=$((MISMATCH+1))
        MISMATCH_ROWS+=$(printf '    %-24s sumber=%-8s restore=%s\n' "$t" "$src" "$dst")
      fi
    done

    if [[ "$MISMATCH" -gt 0 ]]; then
      c_fail "Ditemukan $MISMATCH tabel dengan jumlah baris berbeda:"
      printf '%s\n' "$MISMATCH_ROWS"
      exit 1
    fi
    c_ok "Semua ${#ALL_TABLES[@]} tabel cocok dengan sumber."
  else
    c_warn "Container sumber '$SOURCE_CONTAINER' tidak berjalan - perbandingan dilewati."
  fi
fi

PASS=1
echo ""
echo "================================================================"
echo -e "   \033[32mHASIL: PASS - Backup terbukti dapat di-restore.\033[0m"
echo "================================================================"
echo ""
echo "  Tabel utama:"
for t in Event Guest GuestCheckin Prize Souvenir AdminUser; do
  if printf '%s\n' "${TABLES[@]}" | grep -qxF "$t"; then
    printf '    %-16s %10s baris\n' "$t" "$(count_rows "$TEMP_CONTAINER" "$t")"
  fi
done
echo ""
exit 0
