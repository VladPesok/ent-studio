import { eq, and } from 'drizzle-orm';
import { getDb } from '../connection';
import { appointments, appointmentDoctors, diagnoses, doctors, patients } from '../models';
import { getOrCreateDoctor } from './doctorDao';
import { getOrCreateDiagnosis } from './diagnosisDao';

/**
 * Get appointment data
 */
export function getAppointmentData(folderPath: string, appointmentDate: string) {
  const db = getDb();
  
  // Get patient ID
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) {
    return { doctors: [], diagnosis: '', notes: '' };
  }

  // Get appointment
  const appointment = db
    .select({
      id: appointments.id,
      notes: appointments.notes,
      diagnosis: diagnoses.name,
    })
    .from(appointments)
    .leftJoin(diagnoses, eq(appointments.diagnosisId, diagnoses.id))
    .where(
      and(
        eq(appointments.patientId, patient.id),
        eq(appointments.appointmentDate, appointmentDate)
      )
    )
    .get();

  if (!appointment) {
    return { doctors: [], diagnosis: '', notes: '' };
  }

  // Get doctors for this appointment
  const appointmentDoctorsList = db
    .select({ name: doctors.name })
    .from(appointmentDoctors)
    .innerJoin(doctors, eq(appointmentDoctors.doctorId, doctors.id))
    .where(eq(appointmentDoctors.appointmentId, appointment.id))
    .all();

  return {
    doctors: appointmentDoctorsList.map(d => d.name),
    diagnosis: appointment.diagnosis || '',
    notes: appointment.notes || '',
  };
}

/**
 * Update appointment data
 */
export function updateAppointmentData(
  folderPath: string,
  appointmentDate: string,
  data: {
    doctors?: string[];
    diagnosis?: string;
    notes?: string;
  }
): void {
  const db = getDb();
  
  // Get patient ID
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) return;

  // Get or create appointment
  let appointment = db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patient.id),
        eq(appointments.appointmentDate, appointmentDate)
      )
    )
    .get();

  if (!appointment) {
    const result = db.insert(appointments).values({
      patientId: patient.id,
      appointmentDate,
    }).run();
    appointment = { id: Number(result.lastInsertRowid) };
  }

  // Update appointment fields
  const updates: any = {
    updatedAt: new Date().toISOString(),
  };

  if (data.diagnosis !== undefined) {
    updates.diagnosisId = getOrCreateDiagnosis(data.diagnosis);
  }

  if (data.notes !== undefined) {
    updates.notes = data.notes;
  }

  if (Object.keys(updates).length > 1) {
    db.update(appointments)
      .set(updates)
      .where(eq(appointments.id, appointment.id))
      .run();
  }

  // Update doctors
  if (data.doctors !== undefined) {
    // Clear existing doctors
    db.delete(appointmentDoctors)
      .where(eq(appointmentDoctors.appointmentId, appointment.id))
      .run();
    
    // Add new doctors
    for (const doctorName of data.doctors) {
      const doctorId = getOrCreateDoctor(doctorName);
      if (doctorId) {
        db.insert(appointmentDoctors).values({
          appointmentId: appointment.id,
          doctorId,
        }).run();
      }
    }
  }
}

