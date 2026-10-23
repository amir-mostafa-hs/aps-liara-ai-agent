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
RUN pnpm install --frozen-lockfile --prefer-offline

# Keep Python dependency installation independent from engine source changes.
# The project dependency list stays canonical in pyproject.toml.
COPY engine/pyproject.toml ./engine/pyproject.toml
RUN python3 -c "import subprocess,sys,tomllib; deps=tomllib.load(open('engine/pyproject.toml','rb'))['project']['dependencies']; subprocess.run([sys.executable,'-m','pip','install','--no-cache-dir','--break-system-packages',*deps],check=True)"

COPY apps/web ./apps/web
RUN pnpm --filter web build

# These change more often than dependency manifests and are not needed for the
# Next.js build, so copying them afterwards preserves the expensive build layers.
COPY engine ./engine
COPY sample-apps ./sample-apps

RUN useradd --create-home --shell /usr/sbin/nologin agent \
    && mkdir -p /app/apps/web/.workspace /app/apps/web/.next/cache \
    && chown -R agent:agent /app/apps/web/.workspace /app/apps/web/.next/cache /home/agent

COPY deploy/liara-entrypoint.sh /usr/local/bin/liara-entrypoint
COPY deploy/supervisord.conf /etc/supervisor/conf.d/liara-agent.conf
RUN chmod 0755 /usr/local/bin/liara-entrypoint

USER agent
ENV NODE_ENV=production
EXPOSE 3000
CMD ["/usr/local/bin/liara-entrypoint"]
