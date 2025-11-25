import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/db?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});

