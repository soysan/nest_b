ARG NODE_VERSION=24
ARG TARGET=development

FROM node:${NODE_VERSION}-slim AS base

# 必要なシステムパッケージをインストール
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm

WORKDIR /app

# パッケージファイルをコピーして依存関係をキャッシュ
COPY package.json pnpm-lock.yaml ./

FROM base AS development

# 開発に必要な追加パッケージ
RUN apt-get update && apt-get install -y \
    procps \
    && rm -rf /var/lib/apt/lists/*

# 開発依存関係を含む全依存関係をインストール
RUN pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "run", "start:dev"]

FROM base AS dependencies

# 本番依存関係のみインストール
RUN pnpm install --frozen-lockfile --prod

FROM base AS build

# ビルドに必要な全依存関係をインストール
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:${NODE_VERSION}-slim AS production

# 本番環境に必要な最小限のパッケージのみ
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 本番用依存関係のみコピー
COPY --from=dependencies /app/node_modules ./node_modules

# ビルド済みアプリケーションをコピー
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma

# パッケージファイルをコピー（メタデータ用）
COPY package.json ./

# 非rootユーザーを作成してセキュリティを向上
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# アプリケーションを起動
CMD ["node", "dist/main"]
