import { Module } from '@nestjs/common';
import { HealthController } from '@/infrastructure/http/controllers/health/health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

