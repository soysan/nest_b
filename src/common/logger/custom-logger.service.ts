import { Injectable, LoggerService, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger implements LoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    const logContext = context || this.context || 'Application';
    console.log(`[${this.nowDate()}] [LOG] [${logContext}] ${this.formatMessage(message)}`);
  }

  error(message: any, trace?: string, context?: string) {
    const logContext = context || this.context || 'Application';
    console.error(`[${this.nowDate()}] [ERROR] [${logContext}] ${this.formatMessage(message)}`);
    if (trace) {
      console.error(`[${this.nowDate()}] [TRACE] ${trace}`);
    }
  }

  warn(message: any, context?: string) {
    const logContext = context || this.context || 'Application';
    console.warn(`[${this.nowDate()}] [WARN] [${logContext}] ${this.formatMessage(message)}`);
  }

  debug(message: any, context?: string) {
    const logContext = context || this.context || 'Application';
    console.debug(`[${this.nowDate()}] [DEBUG] [${logContext}] ${this.formatMessage(message)}`);
  }

  verbose(message: any, context?: string) {
    const logContext = context || this.context || 'Application';
    console.log(`[${this.nowDate()}] [VERBOSE] [${logContext}] ${this.formatMessage(message)}`);
  }

  private formatMessage(message: any): string {
    if (typeof message === 'object') {
      return JSON.stringify(message, null, 2);
    }
    return String(message);
  }

  private nowDate(): string {
    return new Date().toISOString();
  }
}
