#!/bin/sh
set -euo pipefail

cd /app/backend

echo "🚀 Starting backend service..."

if [ "${RUN_DATABASE_MIGRATIONS:-true}" = "true" ]; then
  echo "🔄 Running Prisma migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations complete"
fi

if [ "${SEED_DB_ON_START:-false}" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️ Seed command failed"
fi

echo "🎬 Starting application..."
exec node dist/server.js
