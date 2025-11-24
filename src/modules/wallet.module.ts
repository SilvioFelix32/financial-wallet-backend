import { Module } from '@nestjs/common';
import { WalletController } from '@/infrastructure/http/controllers/wallet/wallet.controller';
import { WalletService } from '@/domain/services/wallet/wallet.service';
import { WalletRepository } from '@/domain/services/wallet/wallet.repository';
import { WALLET_REPOSITORY_TOKEN } from '@/domain/services/wallet/wallet.repository.interface';
import { SharedServicesModule } from './shared-services.module';
import { UsersModule } from './users.module';

@Module({
  imports: [SharedServicesModule, UsersModule],
  providers: [
    WalletService,
    {
      provide: WALLET_REPOSITORY_TOKEN,
      useClass: WalletRepository,
    },
  ],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}

