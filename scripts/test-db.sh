#!/usr/bin/env bash
#
# test-db.sh - Menyiapkan database PostgreSQL khusus untuk menjalankan tes.
#
# Database uji TERPISAH dari database produksi maupun development. Skrip ini
# memakai port sendiri (55433) dan nama database berakhiran _test agar tidak
# mungkin tertukar.
#
# Pemakaian:
#   bash scripts/test-db.sh          # nyalakan + terapkan migrasi
#   bash scripts/test-db.sh --reset  # hapus container dulu, lalu buat ulang
#   bash scripts/test-db.sh --down   # matikan & hapus
#
set -Eeuo pipefail

CONTAINER="guest-test-db"
IMAGE="postgres:14-alpine"
PORT="${TEST_DB_PORT:-55433}"
DB_NAME="guest_registry_test"
DB_USER="postgres"
DB_PASS="test"
TEST_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PORT}/${DB_NAME}?schema=public"

c_ok()   { printf '  \033[32m[OK]\033[0m   %s\n' "$*"; }
c_step() { printf '  %s\n' "$*"; }
c_fail() { printf '  \033[31m[FAIL]\033[0m %s\n' "$*"; }

case "${1:-}" in
  --down)
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    c_ok "Container $CONTAINER dihapus."
    exit 0
    ;;
  --reset)
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    ;;
esac

echo ""
c_step "Menyiapkan database uji di port $PORT..."

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker run -d --name "$CONTAINER" \
    -e "POSTGRES_PASSWORD=$DB_PASS" \
    -e "POSTGRES_USER=$DB_USER" \
    -e "POSTGRES_DB=$DB_NAME" \
    -p "${PORT}:5432" "$IMAGE" >/dev/null
  c_ok "Container dibuat."
else
  docker start "$CONTAINER" >/dev/null 2>&1 || true
  c_ok "Container yang ada dipakai ulang."
fi

c_step "Menunggu database siap..."
READY=0
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
if [[ "$READY" -ne 1 ]]; then
  c_fail "Database tidak siap."
  exit 1
fi
c_ok "Database siap."

c_step "Menerapkan migrasi (prisma migrate deploy)..."
cd "$(dirname "$0")/../apps/backend"
DATABASE_URL="$TEST_URL" npx prisma migrate deploy >/dev/null
c_ok "Skema diterapkan."

echo ""
echo "================================================================"
echo "  DATABASE UJI SIAP"
echo "================================================================"
echo ""
echo "  TEST_DATABASE_URL=\"$TEST_URL\""
echo ""
echo "  Jalankan tes:"
echo "    cd apps/backend && npm test"
echo ""
