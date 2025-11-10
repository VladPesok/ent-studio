import { eq, sql, desc } from 'drizzle-orm';
import { getDb } from '../connection';
import { patients, appointments, doctors, diagnoses, type Patient, type NewPatient } from '../models';
import { getOrCreateDoctor } from './doctorDao';
import { getOrCreateDiagnosis } from './diagnosisDao';

/**
 * Get all patients with their related data
 */
export function getAllPatients() {
  const db = getDb();
  
  const results = db
    .select({
      id: patients.id,
      surname: patients.surname,
      name: patients.name,
      birthdate: patients.birthdate,
      folderPath: patients.folderPath,
      patientCardPath: patients.patientCardPath,
      doctor: doctors.name,
      diagnosis: diagnoses.name,
      latestAppointmentDate: sql<string>`(
        SELECT MAX(${appointments.appointmentDate})
        FROM ${appointments}
        WHERE ${appointments.patientId} = ${patients.id}
      )`,
    })
    .from(patients)
    .leftJoin(doctors, eq(patients.primaryDoctorId, doctors.id))
    .leftJoin(diagnoses, eq(patients.primaryDiagnosisId, diagnoses.id))
    .orderBy(patients.surname, patients.name)
    .all();

  return results.map(r => ({
    name: `${r.surname} ${r.name}`.trim(),
    birthdate: r.birthdate,
    latestAppointmentDate: r.latestAppointmentDate || '',
    doctor: r.doctor || '',
    diagnosis: r.diagnosis || '',
    patientCard: r.patientCardPath || '',
    folder: r.folderPath,
  }));
}

/**
 * Get patient by folder path
 */
export function getPatientByFolderPath(folderPath: string) {
  const db = getDb();
  
  const patient = db
    .select({
      id: patients.id,
      surname: patients.surname,
      name: patients.name,
      birthdate: patients.birthdate,
      folderPath: patients.folderPath,
      patientCardPath: patients.patientCardPath,
      doctor: doctors.name,
      diagnosis: diagnoses.name,
    })
    .from(patients)
    .leftJoin(doctors, eq(patients.primaryDoctorId, doctors.id))
    .leftJoin(diagnoses, eq(patients.primaryDiagnosisId, diagnoses.id))
    .where(eq(patients.folderPath, folderPath))
    .get();

  if (!patient) {
    return null;
  }

  // Get appointments for this patient
  const patientAppointments = db
    .select({
      date: appointments.appointmentDate,
    })
    .from(appointments)
    .where(eq(appointments.patientId, patient.id))
    .orderBy(desc(appointments.appointmentDate))
    .all();

  return {
    name: `${patient.surname} ${patient.name}`.trim(),
    birthdate: patient.birthdate,
    latestAppointmentDate: patientAppointments[0]?.date || '',
    doctor: patient.doctor || '',
    diagnosis: patient.diagnosis || '',
    patientCard: patient.patientCardPath || '',
    folder: patient.folderPath,
    appointments: patientAppointments,
  };
}

/**
 * Create a new patient
 */
export function createPatient(
  folderPath: string,
  appointmentDate: string,
  metadata?: {
    name: string;
    birthdate: string;
    doctor: string;
    diagnosis: string;
    patientCard?: string;
  }
): number {
  const db = getDb();
  
  // Parse folder path: Surname_Name_DOB
  const [surname = '', name = '', dob = ''] = folderPath.split('_');
  
  const doctorId = metadata?.doctor ? getOrCreateDoctor(metadata.doctor) : null;
  const diagnosisId = metadata?.diagnosis ? getOrCreateDiagnosis(metadata.diagnosis) : null;

  // Check if patient already exists
  const existing = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
  
  let patientId: number;
  
  if (existing) {
    patientId = existing.id;
  } else {
    const result = db.insert(patients).values({
      surname,
      name,
      birthdate: metadata?.birthdate || dob,
      folderPath,
      patientCardPath: metadata?.patientCard || null,
      primaryDoctorId: doctorId,
      primaryDiagnosisId: diagnosisId,
    }).run();
    
    patientId = Number(result.lastInsertRowid);
  }

  // Create appointment if date is provided
  if (appointmentDate) {
    const appointmentExists = db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        eq(appointments.patientId, patientId),
        eq(appointments.appointmentDate, appointmentDate)
      )
      .get();

    if (!appointmentExists) {
      db.insert(appointments).values({
        patientId,
        appointmentDate,
        diagnosisId,
      }).run();
    }
  }

  return patientId;
}

/**
 * Update patient metadata
 */
export function updatePatientMetadata(
  folderPath: string,
  data: {
    doctor?: string;
    diagnosis?: string;
    patientCard?: string;
  }
): void {
  const db = getDb();
  
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) return;

  const updates: Partial<NewPatient> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.doctor !== undefined) {
    updates.primaryDoctorId = getOrCreateDoctor(data.doctor);
  }

  if (data.diagnosis !== undefined) {
    updates.primaryDiagnosisId = getOrCreateDiagnosis(data.diagnosis);
  }

  if (data.patientCard !== undefined) {
    updates.patientCardPath = data.patientCard || null;
  }

  db.update(patients)
    .set(updates)
    .where(eq(patients.id, patient.id))
    .run();
}

/**
 * Delete patient
 */
export function deletePatient(folderPath: string): void {
  const db = getDb();
  db.delete(patients).where(eq(patients.folderPath, folderPath)).run();
}

