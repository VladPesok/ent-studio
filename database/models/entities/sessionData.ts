import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const sessionData = sqliteTable('session_data', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export type SessionData = typeof sessionData.$inferSelect;
export type NewSessionData = typeof sessionData.$inferInsert;

