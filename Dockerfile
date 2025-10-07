ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base

# Install required system packages for development
RUN apt-get update && apt-get install -y \
    procps \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

FROM base AS development

CMD ["pnpm", "run", "start:dev"]

FROM base AS build
RUN pnpm run build

FROM node:${NODE_VERSION}-slim AS production

# Install required system packages
RUN apt-get update && apt-get install -y \
    procps \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma

CMD ["node", "dist/main"]
