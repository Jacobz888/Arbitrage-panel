#!/bin/bash
set -euo pipefail

BACKEND_URL=${BACKEND_URL:-http://localhost:4000}
HEALTH_ENDPOINT="$BACKEND_URL/health"
SEED_ENDPOINT="$BACKEND_URL/api/seed"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to run this script"
  exit 1
fi

echo "🌱 Seeding Docker database via $SEED_ENDPOINT"

echo "⏳ Waiting for backend service at $HEALTH_ENDPOINT..."
until curl -fsS "$HEALTH_ENDPOINT" >/dev/null; do
  echo "Backend not ready, waiting..."
  sleep 2
done

echo "✅ Backend is healthy"

echo "🌱 Triggering seed endpoint..."
response=$(curl -sS -w "\n%{http_code}" "$SEED_ENDPOINT")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo "✅ Database seeded successfully!"
  if command -v jq >/dev/null 2>&1; then
    echo "$body" | jq .
  else
    echo "$body"
  fi
else
  echo "⚠️ Seed request failed with status $http_code"
  echo "$body"
  exit 1
fi
