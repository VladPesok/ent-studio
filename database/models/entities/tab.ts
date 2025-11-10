import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tabs = sqliteTable('tabs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  folder: text('folder').notNull().unique(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export type Tab = typeof tabs.$inferSelect;
export type NewTab = typeof tabs.$inferInsert;

