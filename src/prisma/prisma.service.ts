import {
  BeforeApplicationShutdown,
  OnModuleDestroy,
  Injectable,
  OnModuleInit
} from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown {

  async onModuleInit() {
    await this.$connect();
  }

  // Nest のモジュール破棄時（テスト・HMR・プロセス終了時）
  async onModuleDestroy() {
    await this.$disconnect();
  }

  // SIGTERM/SIGINT 等での終了直前フック
  async beforeApplicationShutdown() {
    await this.$disconnect();
  }
}
