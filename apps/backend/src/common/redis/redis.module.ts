import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        // If REDIS_URL is provided, use Redis store
        if (redisUrl) {
          try {
            return {
              store: redisStore,
              url: redisUrl,
              ttl: 60 * 1000, // 60 seconds default global TTL
            };
          } catch (e: any) {
            console.error('[Redis] Failed to initialize Redis store, falling back to in-memory:', e.message);
          }
        }
        
        // Fallback to in-memory store if REDIS_URL absent
        return {
          ttl: 60 * 1000,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
