import { CacheService } from '@/domain/services/cache/cache.service';
import { DatabaseService } from '@/domain/services/database/database.service';
import { RedisService } from '@/domain/services/redis/redis.service';
import { CognitoStrategy } from '@/infrastructure/security/auth/strategies/cognito.strategy';
import { ErrorHandler } from '@/shared/errors/error-handler';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [DatabaseService, RedisService, CacheService, ErrorHandler, CognitoStrategy],
  exports: [DatabaseService, RedisService, CacheService, ErrorHandler, CognitoStrategy],
})
export class SharedServicesModule { }

