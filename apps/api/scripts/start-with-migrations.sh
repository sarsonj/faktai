#!/bin/sh
set -e

echo "[api] Running prisma generate..."
pnpm prisma:generate

echo "[api] Applying migrations..."
pnpm prisma:migrate:deploy

echo "[api] Starting API..."
node dist/main.js
