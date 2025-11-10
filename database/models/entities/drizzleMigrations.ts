import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// This table is automatically managed by Drizzle Kit
// It tracks which migrations have been applied
export const drizzleMigrations = sqliteTable('__drizzle_migrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hash: text('hash').notNull(),
  createdAt: text('created_at').notNull(),
});

