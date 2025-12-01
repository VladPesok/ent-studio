import { eq } from 'drizzle-orm';
import { ipcMain } from 'electron';
import { getDb } from '../connection';
import { patientStatuses, PATIENT_STATUS_ACTIVE, PATIENT_STATUS_ARCHIVED, type PatientStatus, type NewPatientStatus } from '../models';

/**
 * Initialize default patient statuses (Active, Archived)
 * Should be called after database connection is established and migrations have run
 * This is a safety check - migrations should already create the default statuses
 */
export function initializeDefaultPatientStatuses(): void {
  const db = getDb();
  
  // Check if statuses already exist
  const existingStatuses = db
    .select({ id: patientStatuses.id })
    .from(patientStatuses)
    .all();
    
  if (existingStatuses.length === 0) {
    // Insert default statuses with specific IDs
    db.insert(patientStatuses).values([
      { id: PATIENT_STATUS_ACTIVE, name: 'Активний', isSystem: true },
      { id: PATIENT_STATUS_ARCHIVED, name: 'Архівований', isSystem: true },
    ]).run();
  }
}

/**
 * Get all patient statuses
 */
export function getAllPatientStatuses(): PatientStatus[] {
  const db = getDb();
  return db
    .select()
    .from(patientStatuses)
    .all();
}

/**
 * Get patient status by ID
 */
export function getPatientStatusById(id: number): PatientStatus | undefined {
  const db = getDb();
  return db
    .select()
    .from(patientStatuses)
    .where(eq(patientStatuses.id, id))
    .get();
}

/**
 * Create a new patient status (non-system)
 */
export function createPatientStatus(name: string): number {
  const db = getDb();
  
  const result = db.insert(patientStatuses).values({
    name: name.trim(),
    isSystem: false,
  }).run();
  
  return Number(result.lastInsertRowid);
}

/**
 * Update patient status name (only non-system statuses)
 */
export function updatePatientStatus(id: number, name: string): boolean {
  const db = getDb();
  
  // Check if it's a system status
  const status = getPatientStatusById(id);
  if (!status || status.isSystem) {
    return false;
  }
  
  db.update(patientStatuses)
    .set({ 
      name: name.trim(),
      updatedAt: new Date().toISOString()
    })
    .where(eq(patientStatuses.id, id))
    .run();
    
  return true;
}

/**
 * Delete patient status (only non-system statuses)
 */
export function deletePatientStatus(id: number): boolean {
  const db = getDb();
  
  // Check if it's a system status
  const status = getPatientStatusById(id);
  if (!status || status.isSystem) {
    return false;
  }
  
  db.delete(patientStatuses)
    .where(eq(patientStatuses.id, id))
    .run();
    
  return true;
}

/**
 * Setup IPC handlers for patient status operations
 */
export function setupPatientStatusIpcHandlers(): void {
  ipcMain.handle("db:patientStatuses:getAll", async () => {
    return getAllPatientStatuses();
  });

  ipcMain.handle("db:patientStatuses:getById", async (_e, id: number) => {
    return getPatientStatusById(id);
  });

  ipcMain.handle("db:patientStatuses:create", async (_e, name: string) => {
    return createPatientStatus(name);
  });

  ipcMain.handle("db:patientStatuses:update", async (_e, id: number, name: string) => {
    return updatePatientStatus(id, name);
  });

  ipcMain.handle("db:patientStatuses:delete", async (_e, id: number) => {
    return deletePatientStatus(id);
  });
}

