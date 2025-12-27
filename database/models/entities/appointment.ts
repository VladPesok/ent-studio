import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { patients } from './patient';
import { diagnoses } from './diagnosis';

export const appointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  appointmentDate: text('appointment_date').notNull(),
  diagnosisId: integer('diagnosis_id').references(() => diagnoses.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_appointments_patient_id').on(table.patientId),
  index('idx_appointments_date').on(table.appointmentDate),
  uniqueIndex('unique_patient_appointment').on(table.patientId, table.appointmentDate),
]);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

