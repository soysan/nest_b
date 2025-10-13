# CustomLogger 使用ガイド

## 概要

`CustomLogger`は、アプリケーション全体で使用できるグローバルなロガーサービスです。`@Global()`デコレータを使用しているため、すべてのモジュールで自動的に利用可能です。

## 特徴

- **グローバルスコープ**: `LoggerModule`が`@Global()`としてマークされているため、どのモジュールでもインポートせずに使用可能
- **トランジェントスコープ**: 各インジェクション先で独立したインスタンスを提供
- **コンテキスト設定**: サービスごとにコンテキストを設定し、ログの出所を明確化
- **タイムスタンプ付き**: すべてのログにISO形式のタイムスタンプが付与
- **構造化ログ**: オブジェクトを自動的にJSON形式でフォーマット

## セットアップ

### 1. LoggerModuleの登録

`app.module.ts`で`LoggerModule`をインポート:

```typescript
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    LoggerModule, // グローバルモジュールとして登録
    // 他のモジュール...
  ],
})
export class AppModule {}
```

## 使用方法

### 基本的な使い方

サービスのコンストラクタで`CustomLogger`をインジェクトし、コンテキストを設定します:

```typescript
import { Injectable } from '@nestjs/common';
import { CustomLogger } from '../common/logger/custom-logger.service';

@Injectable()
export class YourService {
  constructor(private readonly logger: CustomLogger) {
    // コンテキストを設定（通常はクラス名）
    this.logger.setContext('YourService');
  }

  someMethod() {
    this.logger.log('メソッドが呼ばれました');
    this.logger.warn('警告メッセージ');
    this.logger.error('エラーメッセージ', 'スタックトレース');
  }
}
```

### ログレベル

- **log**: 一般的な情報ログ
- **error**: エラーログ（オプションでスタックトレースも記録）
- **warn**: 警告ログ
- **debug**: デバッグ情報
- **verbose**: 詳細ログ

### オブジェクトのログ出力

オブジェクトを渡すと自動的にJSON形式でフォーマットされます:

```typescript
const user = { id: '123', name: 'John Doe' };
this.logger.log(user);
// 出力: [2025-10-13T...] [LOG] [YourService] {
//   "id": "123",
//   "name": "John Doe"
// }
```

## 出力フォーマット

```
[<ISO_TIMESTAMP>] [<LOG_LEVEL>] [<CONTEXT>] <MESSAGE>
```

例:
```
[2025-10-13T12:34:56.789Z] [LOG] [UsersService] Finding user with id: 123
[2025-10-13T12:34:56.890Z] [ERROR] [AuthService] Sign in failed: Invalid credentials
[2025-10-13T12:34:56.891Z] [TRACE] Error: Invalid credentials at ...
```
