import type { Config } from 'drizzle-kit';
import path from 'path';

export default {
  schema: './database/models/entities/*.ts',
  out: './database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(process.env.APPDATA || '', 'ent-studio', 'appData', 'ent-studio.db'),
  },
  verbose: true,
  strict: true,
} satisfies Config;

