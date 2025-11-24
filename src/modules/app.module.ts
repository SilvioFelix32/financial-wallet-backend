import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from './security.module';
import { UsersModule } from './users.module';
import { WalletModule } from './wallet.module';
import { SharedServicesModule } from './shared-services.module';
import { CognitoStrategy } from '@/infrastructure/security/auth/strategies/cognito.strategy';
import { JwtService } from '@nestjs/jwt';
import { GlobalExceptionFilter } from '@/application/exceptions/global-exception.filter';
import { CognitoAuthGuard } from '@/infrastructure/security/auth/guards/jwt-auth.guard';
import { ErrorHandler } from '@/shared/errors/error-handler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SharedServicesModule,
    SecurityModule,
    UsersModule,
    WalletModule,
  ],
  providers: [
    CognitoStrategy,
    JwtService,
    ErrorHandler,
    {
      provide: APP_GUARD,
      useClass: CognitoAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule { }

