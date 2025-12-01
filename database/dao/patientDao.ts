import { eq, sql, desc, and } from 'drizzle-orm';
import { ipcMain } from 'electron';
import { getDb } from '../connection';
import { patients, appointments, doctors, diagnoses, patientStatuses, PATIENT_STATUS_ACTIVE, type Patient, type NewPatient } from '../models';
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
      statusId: patients.statusId,
      statusName: patientStatuses.name,
      latestAppointmentDate: sql<string>`(
        SELECT MAX(${appointments.appointmentDate})
        FROM ${appointments}
        WHERE ${appointments.patientId} = ${patients.id}
      )`,
    })
    .from(patients)
    .leftJoin(doctors, eq(patients.primaryDoctorId, doctors.id))
    .leftJoin(diagnoses, eq(patients.primaryDiagnosisId, diagnoses.id))
    .leftJoin(patientStatuses, eq(patients.statusId, patientStatuses.id))
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
    statusId: r.statusId || PATIENT_STATUS_ACTIVE,
    statusName: r.statusName || 'Активний',
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
      statusId: patients.statusId,
      statusName: patientStatuses.name,
    })
    .from(patients)
    .leftJoin(doctors, eq(patients.primaryDoctorId, doctors.id))
    .leftJoin(diagnoses, eq(patients.primaryDiagnosisId, diagnoses.id))
    .leftJoin(patientStatuses, eq(patients.statusId, patientStatuses.id))
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
    statusId: patient.statusId || PATIENT_STATUS_ACTIVE,
    statusName: patient.statusName || 'Активний',
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
        and(
          eq(appointments.patientId, patientId),
          eq(appointments.appointmentDate, appointmentDate)
        )
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

/**
 * Update patient's status
 */
export function setPatientStatus(folderPath: string, statusId: number): void {
  const db = getDb();
  
  db.update(patients)
    .set({
      statusId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(patients.folderPath, folderPath))
    .run();
}

/**
 * Check if a patient folder already exists
 */
export function patientFolderExists(folderPath: string): boolean {
  const db = getDb();
  const existing = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
  return !!existing;
}

/**
 * Rename patient (update folder path and name in database)
 */
export function renamePatient(
  oldFolderPath: string,
  newFolderPath: string,
  newSurname: string,
  newName: string,
  newBirthdate: string
): { success: boolean; error?: string } {
  const db = getDb();
  
  // Check if new folder already exists
  if (patientFolderExists(newFolderPath)) {
    return { success: false, error: 'Пацієнт з таким іменем вже існує' };
  }
  
  // Update patient record
  db.update(patients)
    .set({
      folderPath: newFolderPath,
      surname: newSurname,
      name: newName,
      birthdate: newBirthdate,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(patients.folderPath, oldFolderPath))
    .run();
    
  return { success: true };
}

/**
 * Setup IPC handlers for patient operations
 */
export function setupPatientIpcHandlers(): void {
  ipcMain.handle("db:patients:getAll", async () => {
    return getAllPatients();
  });

  ipcMain.handle("db:patients:getByFolder", async (_e, folder: string) => {
    return getPatientByFolderPath(folder);
  });

  ipcMain.handle("db:patients:updateMeta", async (_e, folder: string, data: any) => {
    updatePatientMetadata(folder, data);
  });

  ipcMain.handle("db:patients:create", async (_e, base: string, date: string, metadata?: { name: string; birthdate: string; doctor: string; diagnosis: string; patientCard?: string }) => {
    return createPatient(base, date, metadata);
  });

  ipcMain.handle("db:patients:getAppointments", async (_e, folder: string) => {
    const patient = getPatientByFolderPath(folder);
    return patient?.appointments || [];
  });

  ipcMain.handle("db:patients:updateStatus", async (_e, folder: string, statusId: number) => {
    setPatientStatus(folder, statusId);
  });

  ipcMain.handle("db:patients:exists", async (_e, folder: string) => {
    return patientFolderExists(folder);
  });

  ipcMain.handle("db:patients:rename", async (_e, oldFolder: string, newFolder: string, surname: string, name: string, birthdate: string) => {
    return renamePatient(oldFolder, newFolder, surname, name, birthdate);
  });
}
