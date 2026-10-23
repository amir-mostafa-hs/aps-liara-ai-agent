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

# Copy Prisma schema and generate client
COPY apps/web/prisma ./apps/web/prisma
RUN cd apps/web && npx prisma generate

# Copy web source files
COPY apps/web ./apps/web

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && pnpm build

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "--filter", "web", "start"]

