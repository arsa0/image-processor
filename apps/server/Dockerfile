FROM oven/bun:1.3.14 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json        apps/server/package.json
COPY apps/worker/package.json        apps/worker/package.json
COPY apps/web/package.json           apps/web/package.json
COPY packages/shared/package.json    packages/shared/package.json
COPY packages/db/package.json        packages/db/package.json

RUN bun install --frozen-lockfile

COPY . .

RUN cd packages/db && \
    DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    bunx prisma generate --config prisma/prisma.config.ts

RUN bun run --filter @shared/processor build \
    && bun run --filter @db/processor build

FROM oven/bun:1.3.14 AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY apps/server/package.json        apps/server/package.json
COPY apps/worker/package.json        apps/worker/package.json
COPY apps/web/package.json           apps/web/package.json
COPY packages/shared/package.json    packages/shared/package.json
COPY packages/db/package.json        packages/db/package.json
RUN bun install --frozen-lockfile --production

RUN --mount=type=bind,from=builder,source=/app/node_modules/.bun,target=/builder-bun \
    set -eux; \
    src="$(find /builder-bun -type d -path '*@prisma+client*/node_modules/.prisma' | head -n1)"; \
    dst="$(find /app/node_modules/.bun -type d -path '*@prisma+client*/node_modules' | head -n1)"; \
    test -n "$src"; test -n "$dst"; \
    cp -r "$src" "$dst/.prisma"

COPY --from=builder /app/packages/shared/dist  packages/shared/dist
COPY --from=builder /app/packages/db/dist      packages/db/dist

COPY apps/server/src     apps/server/src
COPY apps/server/tsconfig.json apps/server/tsconfig.json

COPY packages/db/prisma  packages/db/prisma

CMD ["bun", "run", "apps/server/src/index.ts"]