FROM node:22-alpine AS base

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy web source files; the package build script generates Prisma once before
# invoking Next.js.
COPY apps/web ./apps/web

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "--filter", "web", "start"]

