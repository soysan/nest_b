ARG NODE_VERSION=24
ARG TARGET=development

FROM node:${NODE_VERSION}-slim AS base

# 必要なシステムパッケージをインストール
RUN apt-get update && apt-get install -y \
    procps \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

FROM base AS development

# package.jsonだけ先にコピー（キャッシュ最適化）
COPY package.json pnpm-lock.yaml ./

# 開発依存関係を含む全依存関係をインストール
RUN pnpm install --frozen-lockfile

# 残りのファイルをコピー
COPY . .

RUN npx prisma generate || true

# ログ出力を確実にするため、バッファリングを無効化
# ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV FORCE_COLOR=1

CMD ["sh", "-c", "pnpm run start:dev 2>&1"]

FROM base AS build

COPY package.json pnpm-lock.yaml ./

# ビルドに必要な全依存関係をインストール (devDependenciesも含む)
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

ARG NODE_VERSION
FROM node:${NODE_VERSION}-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y \
    procps \
    openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# 非rootユーザーを作成してセキュリティを向上
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
USER nestjs

# アプリケーションを起動
CMD ["node", "dist/main.js"]
