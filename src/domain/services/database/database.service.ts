import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { environment } from '@/shared/config/env';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts = 3;
  private readonly retryDelayMs = 1000;
  private readonly pool: Pool;

  constructor() {
    const connectionString = environment.DATABASE_URL;

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
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
      await this.pool.end();
      await app.close();
    });
  }
}
