FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN pnpm --filter @tappyfaktur/shared build
RUN pnpm --filter @tappyfaktur/web build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY infra/docker/start-web-with-runtime-config.sh /app/start-web-with-runtime-config.sh
RUN chmod +x /app/start-web-with-runtime-config.sh
RUN npm i -g serve@14.2.4
EXPOSE 3000
CMD ["/app/start-web-with-runtime-config.sh"]
