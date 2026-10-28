import { Controller, Get } from '@nestjs/common';
import { getHeapStatistics } from 'v8';
import { PrismaService } from './prisma/prisma.service';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: string;
      responseTime: number;
      details?: any;
    };
    memory: {
      status: string;
      heapUsed: number;
      heapTotal: number;
      heapLimit: number;
      rss: number;
      percentUsed: number;
    };
  };
}

/**
 * Ambang pemakaian heap terhadap batas maksimum V8.
 *
 * Dipakai `heapUsed / heap_size_limit`, bukan `heapUsed / heapTotal`: V8
 * menumbuhkan `heapTotal` secara malas, sehingga tepat setelah boot rasio
 * terhadap `heapTotal` selalu mendekati 100% dan health check melaporkan
 * "critical" pada server yang sebenarnya sehat.
 */
const MEMORY_WARNING_PERCENT = 75;
const MEMORY_CRITICAL_PERCENT = 90;

@Controller('health')
export class HealthController {
  private startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const dbHealth = await this.prisma.healthCheck();
    const memUsage = process.memoryUsage();
    const heapLimit = getHeapStatistics().heap_size_limit;
    const heapPercentUsed = heapLimit > 0 ? Math.round((memUsage.heapUsed / heapLimit) * 100) : 0;

    const memoryStatus =
      heapPercentUsed > MEMORY_CRITICAL_PERCENT
        ? 'critical'
        : heapPercentUsed > MEMORY_WARNING_PERCENT
          ? 'warning'
          : 'healthy';

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (dbHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (memoryStatus === 'critical' || memoryStatus === 'warning') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: dbHealth,
        memory: {
          status: memoryStatus,
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapLimit: Math.round(heapLimit / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
          percentUsed: heapPercentUsed,
        },
      },
    };
  }

  @Get('live')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readiness() {
    const dbHealth = await this.prisma.healthCheck();
    if (dbHealth.status === 'unhealthy') {
      return { status: 'not ready', database: dbHealth };
    }
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('db')
  async dbStats() {
    const health = await this.prisma.healthCheck();
    const connectionStats = await this.prisma.getConnectionStats();
    return { ...health, connections: connectionStats };
  }
}
