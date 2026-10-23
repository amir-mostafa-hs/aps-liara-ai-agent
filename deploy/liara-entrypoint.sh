#!/bin/sh
set -eu

cd /app

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be configured before starting the Liara Agent."
  exit 1
fi

if [ -z "${INTERNAL_AGENT_SECRET:-}" ] || [ "$INTERNAL_AGENT_SECRET" = "dev-internal-secret-change-me" ]; then
  echo "A non-default INTERNAL_AGENT_SECRET must be configured before starting the Liara Agent."
  exit 1
fi

if [ -z "${APP_SECRET:-}" ] || [ "$APP_SECRET" = "dev-session-secret-change-me" ]; then
  echo "A non-default APP_SECRET must be configured before starting the Liara Agent."
  exit 1
fi

if [ -z "${ADMIN_PASSWORD:-}" ] || [ "$ADMIN_PASSWORD" = "admin123" ] || [ "$ADMIN_PASSWORD" = "adminpassword123" ] || [ "$ADMIN_PASSWORD" = "change-this-password" ]; then
  echo "A non-default ADMIN_PASSWORD must be configured before starting the Liara Agent."
  exit 1
fi

pnpm --filter web prisma:migrate
pnpm --filter web exec node scripts/ensure-admin.mjs

exec supervisord -n -c /etc/supervisor/conf.d/liara-agent.conf
