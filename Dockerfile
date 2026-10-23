FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:/usr/local/bin:$PATH" \
    NEXT_TELEMETRY_DISABLED=1 \
    PYTHONPATH=/app \
    ENGINE_URL=http://127.0.0.1:8000 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates git python3 python3-pip python3-venv supervisor unzip \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && npm install --global @liara/cli

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
COPY engine ./engine
COPY sample-apps ./sample-apps

RUN pnpm --filter web prisma:generate \
    && pnpm --filter web build \
    && pip3 install --no-cache-dir --break-system-packages ./engine \
    && useradd --create-home --shell /usr/sbin/nologin agent \
    && mkdir -p /app/apps/web/.workspace \
    && chown -R agent:agent /app /home/agent

COPY deploy/liara-entrypoint.sh /usr/local/bin/liara-entrypoint
COPY deploy/supervisord.conf /etc/supervisor/conf.d/liara-agent.conf
RUN chmod 0755 /usr/local/bin/liara-entrypoint

USER agent
ENV NODE_ENV=production
EXPOSE 3000
CMD ["/usr/local/bin/liara-entrypoint"]
