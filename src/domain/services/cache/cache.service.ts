import { RedisService } from '../redis/redis.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await this.redisService.getClient().get(key);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      this.logger.error(`Error getting cache for key: ${key}`, error);
      return null;
    }
  }

  async setCache<T>(key: string, data: T, ttl: number): Promise<string> {
    try {
      this.logger.log(`Setting cache for key: ${key}`);
      await this.redisService.getClient().set(key, JSON.stringify(data), 'EX', ttl);
      return `Cache created for key: ${key}`;
    } catch (error) {
      this.logger.error(`Error setting cache for key: ${key}`, error);
      throw new Error('Error setting cache', { cause: error });
    }
  }
}
