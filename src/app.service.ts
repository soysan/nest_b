import { Injectable } from '@nestjs/common';
import { CustomLogger } from './common/logger/custom-logger.service';

@Injectable()
export class AppService {
  constructor(private readonly logger: CustomLogger) {
    this.logger.setContext('AppService');
  }

  getHello(): string {
    this.logger.log('getHello method called');
    return 'Hello World!';
  }
}
