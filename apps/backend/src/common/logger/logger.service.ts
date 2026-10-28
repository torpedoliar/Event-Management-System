import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
}

/**
 * Menentukan tingkat log dari status HTTP.
 * Dipisahkan agar dapat diuji tanpa membuat instance winston.
 */
export function resolveRequestLevel(statusCode?: number): 'error' | 'warn' | 'info' {
  const status = statusCode ?? 0;
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private logsDir: string;

  constructor() {
    this.logsDir = join(process.cwd(), 'logs');
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }

    const customFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        const ctx = context ? `[${context}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: customFormat,
      transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new DailyRotateFile({
          dirname: this.logsDir,
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: customFormat,
        }),
        new DailyRotateFile({
          dirname: this.logsDir,
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: customFormat,
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  logRequest(data: Partial<LogEntry>) {
    // Tingkat log mengikuti status HTTP agar kegagalan server langsung
    // masuk ke berkas error-*.log dan mudah dicari.
    const level = data.level || resolveRequestLevel(data.statusCode);

    this.logger.log(level, data.message || 'HTTP Request', {
      ...data,
      level,
      context: 'HTTP',
    });
  }

  logAudit(action: string, userId: string, metadata?: Record<string, any>) {
    this.logger.info(`Audit: ${action}`, { context: 'AUDIT', userId, ...metadata });
  }

  // Admin log viewer methods
  getLogFiles(): { name: string; size: number; date: string }[] {
    if (!existsSync(this.logsDir)) return [];
    
    const files = readdirSync(this.logsDir)
      .filter(f => f.endsWith('.log'))
      .map(name => {
        const stat = statSync(join(this.logsDir, name));
        return {
          name,
          size: stat.size,
          date: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return files;
  }

  getLogContent(filename: string, options: { lines?: number; level?: string; search?: string } = {}): LogEntry[] {
    const { lines = 100, level, search } = options;
    const filepath = join(this.logsDir, filename);
    
    if (!existsSync(filepath) || !filename.endsWith('.log')) {
      return [];
    }

    const content = readFileSync(filepath, 'utf-8');
    const logLines = content.trim().split('\n').filter(Boolean);
    
    let entries: LogEntry[] = logLines
      .map(line => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null);

    // Filter by level
    if (level) {
      entries = entries.filter(e => e.level === level);
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      entries = entries.filter(e => 
        e.message?.toLowerCase().includes(searchLower) ||
        e.context?.toLowerCase().includes(searchLower) ||
        JSON.stringify(e.metadata || {}).toLowerCase().includes(searchLower)
      );
    }

    // Return last N lines
    return entries.slice(-lines).reverse();
  }

  getLogStats(): { total: number; byLevel: Record<string, number>; byDate: Record<string, number> } {
    const files = this.getLogFiles();
    const stats = {
      total: 0,
      byLevel: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
    };

    for (const file of files.slice(0, 7)) { // Last 7 days
      const entries = this.getLogContent(file.name, { lines: 10000 });
      stats.total += entries.length;
      
      const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : 'unknown';
      stats.byDate[date] = (stats.byDate[date] || 0) + entries.length;
      
      for (const entry of entries) {
        stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
      }
    }

    return stats;
  }
}
