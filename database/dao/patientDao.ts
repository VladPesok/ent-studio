import { eq, sql, desc, asc, and, or, like, inArray, gte, lte } from 'drizzle-orm';
import { ipcMain } from 'electron';
import { getDb } from '../connection';
import { patients, appointments, doctors, diagnoses, patientStatuses, patientTests, PATIENT_STATUS_ACTIVE, type Patient, type NewPatient } from '../models';
import { getOrCreateDoctor } from './doctorDao';
import { getOrCreateDiagnosis } from './diagnosisDao';
import { getDefaultPatientStatus } from './patientStatusDao';

/**
 * Filter options for patient queries
 */
export interface PatientFilters {
  search?: string;
  name?: string;
  birthdateFrom?: string;
  birthdateTo?: string;
  appointmentDateFrom?: string;
  appointmentDateTo?: string;
  doctorNames?: string[];  // Filter by doctor names
  diagnosisText?: string;  // Filter by diagnosis text (LIKE search)
  statusIds?: number[];
  sortField?: string;
  sortOrder?: 'ascend' | 'descend';
  page?: number;
  pageSize?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Lightweight patient info for select lists
 */
export interface PatientListItem {
  id: number;
  surname: string;
  name: string;
  birthdate: string;
  folder: string;
}

/**
 * Get lightweight list of all patients (for select dropdowns)
 */
export function getAllPatientsLightweight(): PatientListItem[] {
  const db = getDb();
  
  const results = db
    .select({
      id: patients.id,
      surname: patients.surname,
      name: patients.name,
      birthdate: patients.birthdate,
      folder: patients.folderPath,
    })
    .from(patients)
    .orderBy(patients.surname, patients.name)
    .all();

  return results;
}

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
      doctorId: patients.primaryDoctorId,
      diagnosis: diagnoses.name,
      diagnosisId: patients.primaryDiagnosisId,
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
    doctorId: r.doctorId,
    diagnosis: r.diagnosis || '',
    diagnosisId: r.diagnosisId,
    patientCard: r.patientCardPath || '',
    folder: r.folderPath,
    statusId: r.statusId || PATIENT_STATUS_ACTIVE,
    statusName: r.statusName || 'Активний',
  }));
}

/**
 * Get patients with filtering, sorting, and pagination at database level
 */
export function getPatientsFiltered(filters?: PatientFilters): PaginatedResult<ReturnType<typeof getAllPatients>[number]> {
  const db = getDb();
  // Build WHERE conditions
  const conditions: ReturnType<typeof eq>[] = [];
  
  // Search filter (searches in surname and name)
  if (filters?.search) {
    const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`casefold(${patients.surname})`, searchTerm),
        like(sql`casefold(${patients.name})`, searchTerm),
        like(sql`casefold(${patients.surname} || ' ' || casefold(${patients.name}))`, searchTerm)
      )!
    );
  }
  
  // Name filter
  if (filters?.name) {
    const nameTerm = `%${filters.name.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`casefold(${patients.surname})`, nameTerm),
        like(sql`casefold(${patients.name})`, nameTerm),
        like(sql`casefold(${patients.surname} || ' ' || casefold(${patients.name}))`, nameTerm)
      )!
    );
  }
  
  // Birthdate range filter
  if (filters?.birthdateFrom) {
    conditions.push(gte(patients.birthdate, filters.birthdateFrom));
  }
  if (filters?.birthdateTo) {
    conditions.push(lte(patients.birthdate, filters.birthdateTo));
  }
  
  // Doctor filter (by names)
  if (filters?.doctorNames && filters.doctorNames.length > 0) {
    conditions.push(inArray(doctors.name, filters.doctorNames));
  }
  
  // Diagnosis filter (text search)
  if (filters?.diagnosisText) {
    const diagnosisTerm = `%${filters.diagnosisText.toLowerCase()}%`;
    conditions.push(like(sql`casefold(${diagnoses.name})`, diagnosisTerm));
  }
  
  // Status filter
  if (filters?.statusIds && filters.statusIds.length > 0) {
    conditions.push(inArray(patients.statusId, filters.statusIds));
  }
  
  // Base query with filters
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  // Build ORDER BY
  let orderByClause;
  const sortOrder = filters?.sortOrder === 'ascend' ? asc : desc;
  
  switch (filters?.sortField) {
    case 'name':
      orderByClause = [sortOrder(patients.surname), sortOrder(patients.name)];
      break;
    case 'birthdate':
      orderByClause = [sortOrder(patients.birthdate)];
      break;
    case 'doctor':
      orderByClause = [sortOrder(doctors.name)];
      break;
    case 'diagnosis':
      orderByClause = [sortOrder(diagnoses.name)];
      break;
    case 'statusName':
    case 'status':
      orderByClause = [sortOrder(patientStatuses.name)];
      break;
    case 'latestAppointmentDate':
    case 'appointmentDate':
    default:
      // For appointment date, we need to sort by the subquery result
      orderByClause = filters?.sortOrder === 'ascend' 
        ? [asc(sql`(SELECT MAX(${appointments.appointmentDate}) FROM ${appointments} WHERE ${appointments.patientId} = ${patients.id})`)]
        : [desc(sql`(SELECT MAX(${appointments.appointmentDate}) FROM ${appointments} WHERE ${appointments.patientId} = ${patients.id})`)];
      break;
  }

  // Get total count first
  const countResult = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(patients)
    .leftJoin(doctors, eq(patients.primaryDoctorId, doctors.id))
    .leftJoin(diagnoses, eq(patients.primaryDiagnosisId, diagnoses.id))
    .leftJoin(patientStatuses, eq(patients.statusId, patientStatuses.id))
    .where(whereClause)
    .get();
  
  const total = countResult?.count || 0;
  
  // Pagination
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const offset = (page - 1) * pageSize;
  
  // Main query with pagination
  let query = db
    .select({
      id: patients.id,
      surname: patients.surname,
      name: patients.name,
      birthdate: patients.birthdate,
      folderPath: patients.folderPath,
      patientCardPath: patients.patientCardPath,
      doctor: doctors.name,
      doctorId: patients.primaryDoctorId,
      diagnosis: diagnoses.name,
      diagnosisId: patients.primaryDiagnosisId,
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
    .where(whereClause)
    .orderBy(...orderByClause)
    .limit(pageSize)
    .offset(offset);

  // Apply appointment date filter after query (needs subquery result)
  let results = query.all();
  
  // Post-filter for appointment date (since it's a computed field)
  if (filters?.appointmentDateFrom || filters?.appointmentDateTo) {
    results = results.filter(r => {
      if (!r.latestAppointmentDate) return false;
      if (filters.appointmentDateFrom && r.latestAppointmentDate < filters.appointmentDateFrom) return false;
      if (filters.appointmentDateTo && r.latestAppointmentDate > filters.appointmentDateTo) return false;
      return true;
    });
  }

  const data = results.map(r => ({
    name: `${r.surname} ${r.name}`.trim(),
    birthdate: r.birthdate,
    latestAppointmentDate: r.latestAppointmentDate || '',
    doctor: r.doctor || '',
    doctorId: r.doctorId,
    diagnosis: r.diagnosis || '',
    diagnosisId: r.diagnosisId,
    patientCard: r.patientCardPath || '',
    folder: r.folderPath,
    statusId: r.statusId || PATIENT_STATUS_ACTIVE,
    statusName: r.statusName || 'Активний',
  }));

  return {
    data,
    total,
    page,
    pageSize
  };
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
    // Get the default status for new patients
    const defaultStatus = getDefaultPatientStatus();
    const statusId = defaultStatus?.id ?? PATIENT_STATUS_ACTIVE;

    const result = db.insert(patients).values({
      surname,
      name,
      birthdate: metadata?.birthdate || dob,
      folderPath,
      patientCardPath: metadata?.patientCard || null,
      primaryDoctorId: doctorId,
      primaryDiagnosisId: diagnosisId,
      statusId,
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
 * Get all appointment dates for a patient
 */
export function getPatientAppointmentDates(folderPath: string): string[] {
  const db = getDb();
  
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) return [];

  const appointmentDates = db
    .select({ date: appointments.appointmentDate })
    .from(appointments)
    .where(eq(appointments.patientId, patient.id))
    .all();

  return appointmentDates.map(a => a.date);
}

/**
 * Merge appointments from source patient to target patient
 * Returns list of appointment dates that were merged
 */
export function mergePatientAppointments(
  sourceFolder: string,
  targetFolder: string
): { mergedDates: string[]; existingDates: string[] } {
  const db = getDb();
  
  // Get source and target patient IDs
  const sourcePatient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, sourceFolder))
    .get();
    
  const targetPatient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, targetFolder))
    .get();
    
  if (!sourcePatient || !targetPatient) {
    return { mergedDates: [], existingDates: [] };
  }

  // Get target's existing appointment dates
  const targetAppointments = db
    .select({ date: appointments.appointmentDate })
    .from(appointments)
    .where(eq(appointments.patientId, targetPatient.id))
    .all();
  const existingDates = new Set(targetAppointments.map(a => a.date));

  // Get source appointments
  const sourceAppointments = db
    .select({
      id: appointments.id,
      date: appointments.appointmentDate,
      diagnosisId: appointments.diagnosisId,
      notes: appointments.notes,
    })
    .from(appointments)
    .where(eq(appointments.patientId, sourcePatient.id))
    .all();

  const mergedDates: string[] = [];
  const existingDatesList: string[] = [];

  // Map old appointment IDs to new appointment IDs for test migration
  const appointmentIdMap = new Map<number, number>();

  for (const appt of sourceAppointments) {
    if (existingDates.has(appt.date)) {
      // Appointment with this date already exists in target
      existingDatesList.push(appt.date);
    } else {
      // Create new appointment for target patient
      const result = db.insert(appointments).values({
        patientId: targetPatient.id,
        appointmentDate: appt.date,
        diagnosisId: appt.diagnosisId,
        notes: appt.notes,
      }).run();
      
      const newAppointmentId = Number(result.lastInsertRowid);
      appointmentIdMap.set(appt.id, newAppointmentId);
      
      // Copy appointment doctors
      const sourceApptDoctors = db
        .select({ doctorId: sql<number>`doctor_id` })
        .from(sql`appointment_doctors`)
        .where(sql`appointment_id = ${appt.id}`)
        .all();
        
      for (const doc of sourceApptDoctors) {
        db.run(sql`INSERT INTO appointment_doctors (appointment_id, doctor_id) VALUES (${newAppointmentId}, ${doc.doctorId})`);
      }
      
      mergedDates.push(appt.date);
    }
  }

  // Move patient tests from source to target patient and remap appointment IDs
  if (appointmentIdMap.size > 0) {
    const caseClauses = Array.from(appointmentIdMap)
      .map(([oldId, newId]) => `WHEN ${oldId} THEN ${newId}`)
      .join(' ');
    db.run(sql`
      UPDATE patient_tests 
      SET patient_id = ${targetPatient.id},
          appointment_id = CASE appointment_id ${sql.raw(caseClauses)} ELSE appointment_id END
      WHERE patient_id = ${sourcePatient.id}
    `);
  } else {
    db.update(patientTests)
      .set({ patientId: targetPatient.id })
      .where(eq(patientTests.patientId, sourcePatient.id))
      .run();
  }

  return { mergedDates, existingDates: existingDatesList };
}

/**
 * Delete patient and all their appointments
 */
export function deletePatientWithAppointments(folderPath: string): boolean {
  const db = getDb();
  
  const patient = db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.folderPath, folderPath))
    .get();
    
  if (!patient) return false;

  // Get all appointment IDs for this patient
  const patientAppointments = db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.patientId, patient.id))
    .all();

  // Delete appointment doctors
  for (const appt of patientAppointments) {
    db.run(sql`DELETE FROM appointment_doctors WHERE appointment_id = ${appt.id}`);
  }

  // Delete appointments
  db.delete(appointments)
    .where(eq(appointments.patientId, patient.id))
    .run();

  // Delete patient
  db.delete(patients)
    .where(eq(patients.id, patient.id))
    .run();

  return true;
}

/**
 * Setup IPC handlers for patient operations
 */
export function setupPatientIpcHandlers(): void {
  ipcMain.handle("db:patients:getAll", async () => {
    return getAllPatients();
  });

  ipcMain.handle("db:patients:getFiltered", async (_e, filters?: PatientFilters) => {
    return getPatientsFiltered(filters);
  });

  ipcMain.handle("db:patients:getAllLightweight", async () => {
    return getAllPatientsLightweight();
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

  ipcMain.handle("db:patients:getAppointmentDates", async (_e, folder: string) => {
    return getPatientAppointmentDates(folder);
  });

  ipcMain.handle("db:patients:mergeAppointments", async (_e, sourceFolder: string, targetFolder: string) => {
    return mergePatientAppointments(sourceFolder, targetFolder);
  });

  ipcMain.handle("db:patients:deleteWithAppointments", async (_e, folder: string) => {
    return deletePatientWithAppointments(folder);
  });
}
