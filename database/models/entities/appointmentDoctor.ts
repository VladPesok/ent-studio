import { sqliteTable, integer, index } from 'drizzle-orm/sqlite-core';
import { appointments } from './appointment';
import { doctors } from './doctor';

export const appointmentDoctors = sqliteTable('appointment_doctors', {
  appointmentId: integer('appointment_id').notNull().references(() => appointments.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id').notNull().references(() => doctors.id, { onDelete: 'cascade' }),
}, (table) => [
  index('pk_appointment_doctors').on(table.appointmentId, table.doctorId),
]);

export type AppointmentDoctor = typeof appointmentDoctors.$inferSelect;
export type NewAppointmentDoctor = typeof appointmentDoctors.$inferInsert;

