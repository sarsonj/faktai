#!/bin/sh
set -e

echo "[app] Running prisma generate..."
pnpm prisma:generate

echo "[app] Applying migrations..."
pnpm prisma:migrate:deploy

# Jednorázový převod ze staré PostgreSQL databáze (CR-0061). Do neprázdné
# SQLite databáze se nic nepřevádí, proměnnou lze po převodu klidně smazat.
if [ -n "${IMPORT_FROM_POSTGRES_URL:-}" ]; then
  echo "[app] Importing data from PostgreSQL..."
  node dist/tools/import-from-postgres.js
fi

echo "[app] Starting FaktAI..."
exec node dist/main.js
