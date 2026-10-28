#!/usr/bin/env bash
#
# baseline-db.sh - Menandai database produksi yang SUDAH ADA sebagai sudah
#                  menerapkan migrasi baseline.
#
# Kapan dipakai:
#   Hanya SEKALI, pada database yang dibuat sebelum migrasi baseline ada
#   (yaitu database hasil `prisma db push`). Skrip ini TIDAK mengubah struktur
#   tabel apa pun - ia hanya mencatat di tabel _prisma_migrations bahwa
#   `0_baseline` sudah diterapkan, karena kenyataannya memang sudah.
#
# Tanpa langkah ini, `prisma migrate deploy` berikutnya akan mencoba membuat
# ulang seluruh tabel dan gagal dengan "relation already exists".
#
# Pemakaian:
#   bash scripts/baseline-db.sh            # cek status saja (tidak mengubah apa pun)
#   bash scripts/baseline-db.sh --apply    # terapkan penandaan baseline
#
set -Eeuo pipefail

APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

DB_CONTAINER="${DB_CONTAINER:-guest-db-prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

c_ok()   { printf '  \033[32m[OK]\033[0m   %s\n' "$*"; }
c_fail() { printf '  \033[31m[FAIL]\033[0m %s\n' "$*"; }
c_step() { printf '  %s\n' "$*"; }

echo ""
echo "================================================================"
echo "        BASELINE DATABASE - PENANDAAAN MIGRASI AWAL"
echo "================================================================"
echo ""

# -------------------------------------------------------------- prasyarat
[[ -f "$ENV_FILE" ]] || { c_fail "$ENV_FILE tidak ditemukan. Jalankan dari root proyek."; exit 1; }
command -v docker >/dev/null 2>&1 || { c_fail "Docker tidak ditemukan."; exit 1; }

DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
DB_USER=${DB_USER:-postgres}
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
DB_NAME=${DB_NAME:-guest_registry}

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  c_fail "Container database '$DB_CONTAINER' tidak berjalan."
  c_step "Nyalakan dulu: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d postgres"
  exit 1
fi

c_ok "Database: $DB_USER@$DB_CONTAINER/$DB_NAME"

q() { docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1" | tr -d '[:space:]'; }

# -------------------------------------------------------------- deteksi
HAS_APP_TABLE=$(q "SELECT to_regclass('public.\"Guest\"') IS NOT NULL;")
HAS_MIG_TABLE=$(q "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;")

if [[ "$HAS_APP_TABLE" != "t" ]]; then
  echo ""
  c_ok "Database masih kosong."
  c_step "Tidak perlu baseline - 'prisma migrate deploy' akan membuat seluruh skema."
  exit 0
fi

if [[ "$HAS_MIG_TABLE" == "t" ]]; then
  APPLIED=$(q "SELECT count(*) FROM _prisma_migrations WHERE migration_name='0_baseline' AND finished_at IS NOT NULL;")
  if [[ "$APPLIED" -gt 0 ]]; then
    echo ""
    c_ok "Migrasi 0_baseline sudah tercatat. Tidak ada yang perlu dilakukan."
    exit 0
  fi
fi

# -------------------------------------------------------------- perlu baseline
echo ""
c_step "Database berisi data tetapi belum mencatat migrasi 0_baseline."
c_step "Ini kondisi normal untuk database lama yang dibuat dengan 'prisma db push'."
echo ""

if [[ "$APPLY" -ne 1 ]]; then
  printf '  \033[33m[AKSI DIPERLUKAN]\033[0m Jalankan sekali:\n\n'
  echo "      bash scripts/baseline-db.sh --apply"
  echo ""
  c_step "Tanpa langkah ini, 'prisma migrate deploy' akan gagal karena tabel sudah ada."
  exit 3
fi

# -------------------------------------------------------------- verifikasi drift
c_step "Memeriksa apakah struktur database sudah sesuai schema.prisma..."
set +e
DIFF_OUT=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps \
  -e DATABASE_URL="postgresql://${DB_USER}:${DB_PASS:-$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')}@postgres:5432/${DB_NAME}?schema=public" \
  backend sh -c "npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code" 2>&1)
DIFF_RC=$?
set -e

if [[ "$DIFF_RC" -eq 2 ]]; then
  c_fail "Struktur database BERBEDA dari schema.prisma."
  echo "$DIFF_OUT" | tail -n 30 | sed 's/^/      /'
  echo ""
  c_step "JANGAN melanjutkan baseline otomatis. Drift ini harus ditinjau manual"
  c_step "karena menandai baseline akan menyembunyikan perbedaan tersebut."
  echo ""
  c_step "Buat migrasi perbaikan lebih dulu:"
  c_step "  npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \\"
  c_step "      --to-schema-datamodel prisma/schema.prisma --script > perbaikan.sql"
  exit 1
elif [[ "$DIFF_RC" -ne 0 ]]; then
  c_fail "Gagal memeriksa drift (exit $DIFF_RC). Baseline dibatalkan."
  echo "$DIFF_OUT" | tail -n 20 | sed 's/^/      /'
  exit 1
fi
c_ok "Tidak ada drift - struktur database sudah sesuai schema.prisma."

# -------------------------------------------------------------- terapkan
echo ""
c_step "Menandai 0_baseline sebagai sudah diterapkan (tidak mengubah tabel)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps \
  backend npx prisma migrate resolve --applied 0_baseline
c_ok "Baseline tercatat."

echo ""
c_step "Memverifikasi status migrasi..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps \
  backend npx prisma migrate status

echo ""
echo "================================================================"
echo -e "   \033[32mSELESAI - Database siap menerima 'migrate deploy'.\033[0m"
echo "================================================================"
echo ""
echo "  Langkah berikutnya: jalankan update/deploy seperti biasa."
echo "  Mulai sekarang setiap perubahan schema.prisma WAJIB lewat migrasi:"
echo "    npx prisma migrate dev --name nama_perubahan"
echo ""
exit 0
