# FaktAI – jedna aplikace (CR-0061): API servíruje i sestavený web,
# data (SQLite, přílohy, zálohy) leží v perzistentním adresáři /data.
FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

# Závislosti pro běh (API + shared)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @tappyfaktur/api...

# Sestavení API i webu
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @tappyfaktur/shared build
RUN pnpm --filter @tappyfaktur/api build
RUN pnpm --filter @tappyfaktur/web build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/assets ./apps/api/assets
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/scripts ./apps/api/scripts
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/package.json ./package.json
WORKDIR /app/apps/api
ENV API_PORT=3000 \
    DATABASE_URL=file:/data/faktai.db \
    ATTACHMENTS_DIR=/data/attachments \
    BACKUP_DIR=/data/backups \
    WEB_DIST_DIR=/app/apps/web/dist
RUN mkdir -p /data/attachments /data/backups
VOLUME ["/data"]
EXPOSE 3000
CMD ["./scripts/start-with-migrations.sh"]
