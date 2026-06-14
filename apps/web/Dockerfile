FROM oven/bun:1.3.14 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json           apps/web/package.json
COPY apps/server/package.json        apps/server/package.json
COPY apps/worker/package.json        apps/worker/package.json
COPY packages/shared/package.json    packages/shared/package.json
COPY packages/db/package.json        packages/db/package.json
RUN bun install --frozen-lockfile

COPY . .

RUN bun run --filter @shared/processor build

RUN bun run --filter @app/web build

FROM nginx:1.27-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80