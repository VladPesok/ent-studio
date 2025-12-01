import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const patientStatuses = sqliteTable('patient_statuses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  // isSystem: true means it cannot be deleted or renamed (Active, Archived)
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export type PatientStatus = typeof patientStatuses.$inferSelect;
export type NewPatientStatus = typeof patientStatuses.$inferInsert;

// Default status IDs
export const PATIENT_STATUS_ACTIVE = 1;
export const PATIENT_STATUS_ARCHIVED = 2;

