import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { doctors } from './doctor';
import { diagnoses } from './diagnosis';
import { patientStatuses, PATIENT_STATUS_ACTIVE } from './patientStatus';

export const patients = sqliteTable('patients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  surname: text('surname').notNull(),
  name: text('name').notNull(),
  birthdate: text('birthdate').notNull(),
  folderPath: text('folder_path').notNull().unique(),
  patientCardPath: text('patient_card_path'),
  primaryDoctorId: integer('primary_doctor_id').references(() => doctors.id, { onDelete: 'set null' }),
  primaryDiagnosisId: integer('primary_diagnosis_id').references(() => diagnoses.id, { onDelete: 'set null' }),
  statusId: integer('status_id').references(() => patientStatuses.id, { onDelete: 'set null' }).default(PATIENT_STATUS_ACTIVE),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('idx_patients_folder_path').on(table.folderPath),
]);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

