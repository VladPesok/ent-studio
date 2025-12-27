import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const testTemplates = sqliteTable('test_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  testType: text('test_type').notNull(),
  description: text('description'),
  templateData: text('template_data', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export type TestTemplate = typeof testTemplates.$inferSelect;
export type NewTestTemplate = typeof testTemplates.$inferInsert;

