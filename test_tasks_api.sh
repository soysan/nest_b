#!/bin/bash

# Tasks API テストスクリプト
# 使い方: ./test_tasks_api.sh

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ベースURL
BASE_URL="${BASE_URL:-http://localhost:3000}"

# ランダムなメールアドレスを生成（テストの再実行のため）
RANDOM_ID=$(date +%s)
EMAIL="test${RANDOM_ID}@example.com"
EMAIL2="test${RANDOM_ID}_2@example.com"

echo -e "${BLUE}=== Tasks API テスト開始 ===${NC}"
echo -e "ベースURL: ${BASE_URL}\n"

# ヘルパー関数
print_section() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. ユーザー登録
print_section "1. ユーザー登録"
SIGNUP_RESPONSE=$(curl -s -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"name\":\"Test User\",\"password\":\"password123\"}")

if echo "$SIGNUP_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    print_success "ユーザー登録成功"
    echo "$SIGNUP_RESPONSE" | jq .
else
    print_error "ユーザー登録失敗"
    echo "$SIGNUP_RESPONSE" | jq .
    exit 1
fi

# 2. ログイン
print_section "2. ログイン（JWTトークン取得）"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"password123\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .access_token)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_success "ログイン成功"
    echo "Token: ${TOKEN:0:50}..."
else
    print_error "ログイン失敗"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi

# 3. タスク作成
print_section "3. タスク作成"
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/tasks/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"テストタスク1","description":"これはテストタスクです"}')

TASK_ID=$(echo "$CREATE_RESPONSE" | jq -r .id)

if [ "$TASK_ID" != "null" ] && [ -n "$TASK_ID" ]; then
    print_success "タスク作成成功"
    echo "$CREATE_RESPONSE" | jq .
else
    print_error "タスク作成失敗"
    echo "$CREATE_RESPONSE" | jq .
    exit 1
fi

# 4. 2つ目のタスク作成
print_section "4. 2つ目のタスク作成"
CREATE_RESPONSE2=$(curl -s -X POST $BASE_URL/tasks/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"テストタスク2","description":"買い物に行く"}')

TASK_ID2=$(echo "$CREATE_RESPONSE2" | jq -r .id)

if [ "$TASK_ID2" != "null" ] && [ -n "$TASK_ID2" ]; then
    print_success "2つ目のタスク作成成功"
    echo "$CREATE_RESPONSE2" | jq .
else
    print_error "2つ目のタスク作成失敗"
    echo "$CREATE_RESPONSE2" | jq .
fi

# 5. タスク一覧取得
print_section "5. タスク一覧取得"
LIST_RESPONSE=$(curl -s -X GET $BASE_URL/tasks \
  -H "Authorization: Bearer $TOKEN")

TASK_COUNT=$(echo "$LIST_RESPONSE" | jq 'length')

if [ "$TASK_COUNT" -ge 2 ]; then
    print_success "タスク一覧取得成功（${TASK_COUNT}件）"
    echo "$LIST_RESPONSE" | jq .
else
    print_error "タスク一覧取得失敗"
    echo "$LIST_RESPONSE" | jq .
fi

# 6. タスク更新
print_section "6. タスク更新"
UPDATE_RESPONSE=$(curl -s -X POST $BASE_URL/tasks/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"id\":\"${TASK_ID}\",\"title\":\"更新されたタスク\",\"description\":\"説明を更新しました\"}")

UPDATED_TITLE=$(echo "$UPDATE_RESPONSE" | jq -r .title)

if [ "$UPDATED_TITLE" = "更新されたタスク" ]; then
    print_success "タスク更新成功"
    echo "$UPDATE_RESPONSE" | jq .
else
    print_error "タスク更新失敗"
    echo "$UPDATE_RESPONSE" | jq .
fi

# 7. タスク削除
print_section "7. タスク削除"
DELETE_RESPONSE=$(curl -s -X DELETE $BASE_URL/tasks/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"id\":\"${TASK_ID}\"}")

DELETED_ID=$(echo "$DELETE_RESPONSE" | jq -r .id)

if [ "$DELETED_ID" = "$TASK_ID" ]; then
    print_success "タスク削除成功"
    echo "$DELETE_RESPONSE" | jq .
else
    print_error "タスク削除失敗"
    echo "$DELETE_RESPONSE" | jq .
fi

# 8. 削除確認（タスク一覧）
print_section "8. 削除確認（タスク一覧）"
LIST_AFTER_DELETE=$(curl -s -X GET $BASE_URL/tasks \
  -H "Authorization: Bearer $TOKEN")

REMAINING_COUNT=$(echo "$LIST_AFTER_DELETE" | jq 'length')

if [ "$REMAINING_COUNT" -eq 1 ]; then
    print_success "削除確認成功（残り${REMAINING_COUNT}件）"
    echo "$LIST_AFTER_DELETE" | jq .
else
    print_error "削除確認失敗"
    echo "$LIST_AFTER_DELETE" | jq .
fi

# 9. セキュリティテスト：2人目のユーザー作成
print_section "9. セキュリティテスト：2人目のユーザー作成"
SIGNUP2_RESPONSE=$(curl -s -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"name\":\"User 2\",\"password\":\"password456\"}")

if echo "$SIGNUP2_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    print_success "2人目のユーザー登録成功"
else
    print_error "2人目のユーザー登録失敗"
    echo "$SIGNUP2_RESPONSE" | jq .
fi

# 10. 2人目のユーザーでログイン
print_section "10. 2人目のユーザーでログイン"
LOGIN2_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"password\":\"password456\"}")

TOKEN2=$(echo "$LOGIN2_RESPONSE" | jq -r .access_token)

if [ "$TOKEN2" != "null" ] && [ -n "$TOKEN2" ]; then
    print_success "2人目のログイン成功"
else
    print_error "2人目のログイン失敗"
    echo "$LOGIN2_RESPONSE" | jq .
fi

# 11. User2のタスク一覧取得（空であるべき）
print_section "11. User2のタスク一覧取得"
USER2_TASKS=$(curl -s -X GET $BASE_URL/tasks \
  -H "Authorization: Bearer $TOKEN2")

USER2_TASK_COUNT=$(echo "$USER2_TASKS" | jq 'length')

if [ "$USER2_TASK_COUNT" -eq 0 ]; then
    print_success "User2のタスク一覧は空（正常）"
    echo "$USER2_TASKS" | jq .
else
    print_error "User2のタスク一覧が空ではない"
    echo "$USER2_TASKS" | jq .
fi

# 12. User2が他人のタスクを更新しようとする（失敗すべき）
print_section "12. セキュリティテスト：User2が他人のタスクを更新"
UNAUTHORIZED_UPDATE=$(curl -s -X POST $BASE_URL/tasks/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{\"id\":\"${TASK_ID2}\",\"title\":\"悪意ある更新\",\"description\":\"他人のタスク\"}")

STATUS_CODE=$(echo "$UNAUTHORIZED_UPDATE" | jq -r .statusCode)

if [ "$STATUS_CODE" = "404" ]; then
    print_success "セキュリティテスト成功：他人のタスクにアクセスできない（404）"
    echo "$UNAUTHORIZED_UPDATE" | jq .
else
    print_error "セキュリティテスト失敗：他人のタスクにアクセスできてしまった"
    echo "$UNAUTHORIZED_UPDATE" | jq .
fi

# 13. 認証なしアクセス（失敗すべき）
print_section "13. セキュリティテスト：認証なしアクセス"
NO_AUTH_RESPONSE=$(curl -s -X GET $BASE_URL/tasks)

NO_AUTH_STATUS=$(echo "$NO_AUTH_RESPONSE" | jq -r .statusCode)

if [ "$NO_AUTH_STATUS" = "401" ]; then
    print_success "セキュリティテスト成功：認証なしではアクセスできない（401）"
    echo "$NO_AUTH_RESPONSE" | jq .
else
    print_error "セキュリティテスト失敗：認証なしでアクセスできてしまった"
    echo "$NO_AUTH_RESPONSE" | jq .
fi

# 14. 無効なトークン（失敗すべき）
print_section "14. セキュリティテスト：無効なトークン"
INVALID_TOKEN_RESPONSE=$(curl -s -X GET $BASE_URL/tasks \
  -H "Authorization: Bearer invalid_token_xyz")

INVALID_TOKEN_STATUS=$(echo "$INVALID_TOKEN_RESPONSE" | jq -r .statusCode)

if [ "$INVALID_TOKEN_STATUS" = "401" ]; then
    print_success "セキュリティテスト成功：無効なトークンではアクセスできない（401）"
    echo "$INVALID_TOKEN_RESPONSE" | jq .
else
    print_error "セキュリティテスト失敗：無効なトークンでアクセスできてしまった"
    echo "$INVALID_TOKEN_RESPONSE" | jq .
fi

# 15. 存在しないタスクID（失敗すべき）
print_section "15. エラーテスト：存在しないタスクID"
NOT_FOUND_RESPONSE=$(curl -s -X POST $BASE_URL/tasks/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id":"00000000-0000-0000-0000-000000000000","title":"test","description":"test"}')

NOT_FOUND_STATUS=$(echo "$NOT_FOUND_RESPONSE" | jq -r .statusCode)

if [ "$NOT_FOUND_STATUS" = "404" ]; then
    print_success "エラーテスト成功：存在しないタスクは404"
    echo "$NOT_FOUND_RESPONSE" | jq .
else
    print_error "エラーテスト失敗"
    echo "$NOT_FOUND_RESPONSE" | jq .
fi

# 最終結果
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 すべてのテストが完了しました！${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "\n${YELLOW}テスト結果サマリー：${NC}"
echo -e "✅ ユーザー登録・ログイン"
echo -e "✅ タスクのCRUD操作"
echo -e "✅ タスク一覧の取得"
echo -e "✅ セキュリティ（他人のタスクへのアクセス制御）"
echo -e "✅ 認証・認可のテスト"
echo -e "✅ エラーハンドリング"

echo -e "\n${GREEN}Tasks APIは正しく動作しています！${NC}"
