// src/utils/logger.ts
import fs from 'fs';
import path from 'path';

class Logger {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? `\nMeta: ${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}\n`;
  }

  private writeToFile(level: string, message: string): void {
    const logFile = path.join(this.logDir, `${level}.log`);
    fs.appendFileSync(logFile, message);
  }

  info(message: string, meta?: any): void {
    const formattedMessage = this.formatMessage('info', message, meta);
    console.log(`ℹ️  ${message}`);
    this.writeToFile('info', formattedMessage);
  }

  error(message: string, meta?: any): void {
    const formattedMessage = this.formatMessage('error', message, meta);
    console.error(`❌ ${message}`);
    this.writeToFile('error', formattedMessage);
  }

  warn(message: string, meta?: any): void {
    const formattedMessage = this.formatMessage('warn', message, meta);
    console.warn(`⚠️  ${message}`);
    this.writeToFile('warn', formattedMessage);
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage('debug', message, meta);
      console.debug(`🐛 ${message}`);
      this.writeToFile('debug', formattedMessage);
    }
  }
}

export const logger = new Logger();