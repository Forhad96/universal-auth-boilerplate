# {{PROJECT_NAME}} Dockerfile

# --- BUILDER STAGE ---
# Node 24 (matches the dev runtime; prisma 7.9.1 requires ^20.19 || ^22.12 || >=24)
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Enable native build scripts for Prisma & esbuild
RUN pnpm config set allow-build @prisma/engines,esbuild,prisma

# 1. Copy configuration files and Prisma schema
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY prisma ./prisma/

# 2. Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# 3. Copy full source code
COPY . .

# 4. Generate Prisma Client and build TypeScript project
RUN pnpm prisma generate
RUN pnpm build

# 5. Prune devDependencies to keep node_modules lightweight
RUN pnpm prune --prod

# --- RUNNER STAGE ---
FROM node:24-alpine AS runner
WORKDIR /app

# Install curl for Coolify container healthchecks
RUN apk add --no-cache curl

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
ENV NODE_ENV=production

# Copy compiled artifacts and production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# EJS templates are not emitted by tsc. Both src/app.ts and src/app/utils/email.ts
# resolve them from process.cwd(), so they must land at ./src/app/templates.
COPY --from=builder /app/src/app/templates ./src/app/templates

# Entrypoint runs `prisma migrate deploy` before starting the server
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:5000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]