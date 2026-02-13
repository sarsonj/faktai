FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm --filter @tappyfaktur/shared build
RUN pnpm --filter @tappyfaktur/web build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/dist ./apps/web/dist
RUN npm i -g serve
EXPOSE 3000
CMD ["serve", "-s", "apps/web/dist", "-l", "3000"]
