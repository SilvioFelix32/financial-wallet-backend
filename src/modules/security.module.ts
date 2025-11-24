import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CognitoStrategy } from '@/infrastructure/security/auth/strategies/cognito.strategy';
import { UsersModule } from './users.module';
import { UserSyncInterceptor } from '@/shared/interceptors/user-sync.interceptor';
import { CacheService } from '@/domain/services/cache/cache.service';

@Module({
  imports: [PassportModule, UsersModule],
  providers: [
    CognitoStrategy,
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: UserSyncInterceptor,
    },
  ],
  exports: [CognitoStrategy, CacheService],
})
export class SecurityModule {}

