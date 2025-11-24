import { Module } from '@nestjs/common';
import { UsersRepository } from '@/domain/services/users/users.repository';
import { UsersService } from '@/domain/services/users/users.service';
import { UsersController } from '@/infrastructure/http/controllers/users/users.controller';
import { USERS_REPOSITORY_TOKEN } from '@/domain/services/users/users.repository.interface';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY_TOKEN,
      useClass: UsersRepository,
    },
  ],
  exports: [UsersService, USERS_REPOSITORY_TOKEN],
})
export class UsersModule {}

