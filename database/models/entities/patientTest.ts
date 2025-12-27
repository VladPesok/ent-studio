import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { patients } from './patient';
import { appointments } from './appointment';
import { testTemplates } from './testTemplate';

export const patientTests = sqliteTable('patient_tests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  appointmentId: integer('appointment_id').references(() => appointments.id, { onDelete: 'cascade' }),
  testTemplateId: integer('test_template_id').notNull().references(() => testTemplates.id, { onDelete: 'restrict' }),
  testName: text('test_name').notNull(),
  testType: text('test_type').notNull(),
  testData: text('test_data', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_patient_tests_patient_id').on(table.patientId),
  index('idx_patient_tests_appointment_id').on(table.appointmentId),
]);

export type PatientTest = typeof patientTests.$inferSelect;
export type NewPatientTest = typeof patientTests.$inferInsert;

