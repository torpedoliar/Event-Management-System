import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '20', 10);
    const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10', 10);
    const dbUrl = process.env.DATABASE_URL || '';
    
    // Append connection pool params to DATABASE_URL if not already present
    const separator = dbUrl.includes('?') ? '&' : '?';
    const pooledUrl = dbUrl.includes('connection_limit') 
      ? dbUrl 
      : `${dbUrl}${separator}connection_limit=${poolSize}&pool_timeout=${poolTimeout}`;

    super({
      datasources: {
        db: {
          url: pooledUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async healthCheck(): Promise<{ status: string; responseTime: number; details?: any }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        details: {
          connected: true,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async getConnectionStats() {
    try {
      // PostgreSQL specific - get connection info
      const result = await this.$queryRaw<any[]>`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;
      return result[0] || {};
    } catch {
      return { error: 'Unable to fetch connection stats' };
    }
  }
}
