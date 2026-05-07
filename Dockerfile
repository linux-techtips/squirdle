FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install-dev
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS install-prod
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS build
ENV NODE_ENV=production
COPY --from=install-dev /usr/src/app/node_modules node_modules
COPY . .
RUN bun run bundle

FROM base AS release
ENV NODE_ENV=production
ENV DATABASE_URL=/data/squirdle.db
COPY --from=install-prod /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/out ./out
COPY --from=build /usr/src/app/package.json ./package.json

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "serve"]
