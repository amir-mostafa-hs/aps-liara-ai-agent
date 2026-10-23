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

cd /app/apps/web

# Dependencies and the Prisma client are prepared in the image. Calling the
# binaries directly avoids pnpm's runtime dependency verification, which tries
# to rewrite /app/node_modules after the image has switched to the agent user.
./node_modules/.bin/prisma migrate deploy
node scripts/ensure-admin.mjs

cd /app

exec supervisord -n -c /etc/supervisor/conf.d/liara-agent.conf
