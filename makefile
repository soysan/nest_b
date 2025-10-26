# デフォルトのビルドターゲット
TARGET ?= development

# デフォルトターゲット: ヘルプを表示
.PHONY: help
help:
	@echo "利用可能なコマンド:"
	@echo "  make up              - Docker Composeでアプリケーションを起動（デフォルト: development）"
	@echo "  make up TARGET=production - 本番ターゲットで起動"
	@echo "  make up-dev          - 開発環境で起動（development target）"
	@echo "  make up-prod         - 本番環境で起動（production target）"
	@echo "  make down            - Docker Composeでアプリケーションを停止"
	@echo "  make restart         - Docker Composeでアプリケーションを再起動"
	@echo "  make logs            - ログを表示（-f でフォロー）"
	@echo "  make build           - Docker イメージをビルド（デフォルト: development）"
	@echo "  make build TARGET=production - 本番ターゲットでビルド"
	@echo "  make build-dev       - 開発環境でビルド"
	@echo "  make build-prod      - 本番環境でビルド"
	@echo "  make clean           - コンテナとボリュームを削除"
	@echo "  make ps              - 実行中のコンテナを表示"
	@echo "  make shell           - アプリコンテナにシェルで入る"
	@echo "  make migrate-dev     - Prisma開発マイグレーション（スキーマ更新）"
	@echo "  make migrate-deploy  - Prismaマイグレーションを本番適用"
	@echo "  make migrate-reset   - マイグレーションをリセット（開発環境のみ）"
	@echo "  make migrate-status  - マイグレーション状態を確認"
	@echo "  make prisma-generate - Prisma Clientを生成"
	@echo "  make prisma-studio   - Prisma Studioを起動"
	@echo "  make dev             - 開発環境を起動（up + logs）"
	@echo "  make prod            - 本番モードでビルド＆起動"
	@echo "  make test-db-up      - テスト用データベースを起動"
	@echo "  make test-db-down    - テスト用データベースを停止"
	@echo "  make test-db-migrate - テスト用データベースにマイグレーションを適用"
	@echo "  make test-e2e        - E2Eテストを実行（テスト用DB使用）"

# Docker Compose コマンド
.PHONY: up
up:
	TARGET=$(TARGET) docker compose up -d

.PHONY: up-dev
up-dev:
	TARGET=development docker compose up -d

.PHONY: up-prod
up-prod:
	TARGET=production docker compose up -d

.PHONY: down
down:
	docker compose down

.PHONY: restart
restart:
	docker compose restart

.PHONY: logs
logs:
	docker compose logs -f

.PHONY: build
build:
	TARGET=$(TARGET) docker compose build

.PHONY: build-dev
build-dev:
	TARGET=development docker compose build

.PHONY: build-prod
build-prod:
	TARGET=production docker compose build

.PHONY: clean
clean:
	docker compose down -v

.PHONY: ps
ps:
	docker compose ps

# コンテナに入る
.PHONY: shell
shell:
	docker compose exec app bash

# Prisma マイグレーション
.PHONY: migrate-dev
migrate-dev:
	docker compose exec app npx prisma migrate dev

.PHONY: migrate-deploy
migrate-deploy:
	docker compose exec app npx prisma migrate deploy

.PHONY: migrate-reset
migrate-reset:
	docker compose exec app npx prisma migrate reset

.PHONY: migrate-status
migrate-status:
	docker compose exec app npx prisma migrate status

# Prisma Client生成
.PHONY: prisma-generate
prisma-generate:
	docker compose exec app npx prisma generate

# Prisma Studio起動
.PHONY: prisma-studio
prisma-studio:
	docker compose exec app npx prisma studio

# 開発環境ショートカット
.PHONY: dev
dev:
	@make up
	@echo "\n待機中..."
	@sleep 3
	@make logs

# 本番環境ビルド
.PHONY: prod
prod:
	TARGET=production docker compose up --build -d

# テスト用データベース管理
.PHONY: test-db-up
test-db-up:
	docker compose up -d db-test

.PHONY: test-db-down
test-db-down:
	docker compose stop db-test

.PHONY: test-db-migrate
test-db-migrate:
	docker compose exec app sh -c "DATABASE_URL=postgresql://postgres:password@db-test:5432/mydb_v2_test?schema=public npx prisma migrate deploy"

# E2Eテスト実行
.PHONY: test-e2e
test-e2e:
	@echo "テスト用DBを起動中..."
	@make test-db-up
	@echo "マイグレーションを適用中..."
	@sleep 2
	@make test-db-migrate
	@echo "E2Eテストを実行中..."
	@docker compose exec app pnpm test:e2e
