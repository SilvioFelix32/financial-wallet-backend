import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts = 3;
  private readonly retryDelayMs = 1000;

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async connectWithRetry() {
    while (this.connectionAttempts < this.maxConnectionAttempts) {
      try {
        this.logger.log(
          `Connection attempt ${this.connectionAttempts + 1}/${this.maxConnectionAttempts} to database...`,
        );

        await this.$connect();

        this.logger.log('Service connected to database');
        this.logger.log('Active instance: DatabaseService');

        return;
      } catch (err) {
        this.connectionAttempts++;

        if (this.connectionAttempts < this.maxConnectionAttempts) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }

    throw new Error(
      `Maximum connection attempts to connect to the database (${this.maxConnectionAttempts}) reached.`,
    );
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await this.$disconnect();
      await app.close();
    });
  }
}
