FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/ /app/
COPY . .

RUN pnpm --filter @person-ai-chat/api build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --prod --frozen-lockfile --filter @person-ai-chat/api...

FROM node:22-bookworm-slim AS runner

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/main.js"]
