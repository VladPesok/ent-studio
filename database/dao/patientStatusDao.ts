import { eq, isNull } from 'drizzle-orm';
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
      { id: PATIENT_STATUS_ACTIVE, name: 'Активний', isDefault: true },
      { id: PATIENT_STATUS_ARCHIVED, name: 'Архівований', isDefault: false },
    ]).run();
  }
}

/**
 * Get all patient statuses (active only by default)
 */
export function getAllPatientStatuses(includeDeleted: boolean = false): PatientStatus[] {
  const db = getDb();
  if (includeDeleted) {
    return db.select().from(patientStatuses).all();
  }
  return db.select().from(patientStatuses).where(isNull(patientStatuses.deletedAt)).all();
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
 * Get patient status by name
 */
export function getPatientStatusByName(name: string): PatientStatus | undefined {
  const db = getDb();
  return db.select().from(patientStatuses).where(eq(patientStatuses.name, name)).get();
}

/**
 * Create a new patient status
 * If a status with the same name exists and is deleted, restore it
 */
export function createPatientStatus(name: string): number {
  const db = getDb();
  const trimmedName = name.trim();
  
  // Check if already exists (including soft-deleted)
  const existing = getPatientStatusByName(trimmedName);
  if (existing) {
    // If soft-deleted, restore it
    if (existing.deletedAt) {
      db.update(patientStatuses)
        .set({ deletedAt: null, updatedAt: new Date().toISOString() })
        .where(eq(patientStatuses.id, existing.id))
        .run();
    }
    return existing.id;
  }
  
  const result = db.insert(patientStatuses).values({
    name: trimmedName,
  }).run();
  
  return Number(result.lastInsertRowid);
}

/**
 * Update patient status name
 */
export function updatePatientStatus(id: number, name: string): boolean {
  const db = getDb();
  
  const status = getPatientStatusById(id);
  if (!status) {
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
 * Soft delete patient status (cannot delete default status)
 */
export function deletePatientStatus(id: number): boolean {
  const db = getDb();
  
  // Check if it's the default status
  const status = getPatientStatusById(id);
  if (!status || status.isDefault) {
    return false;
  }
  
  db.update(patientStatuses)
    .set({ 
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .where(eq(patientStatuses.id, id))
    .run();
    
  return true;
}

/**
 * Restore soft-deleted patient status
 */
export function restorePatientStatus(id: number): boolean {
  const db = getDb();
  
  const status = getPatientStatusById(id);
  if (!status) {
    return false;
  }
  
  db.update(patientStatuses)
    .set({ 
      deletedAt: null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(patientStatuses.id, id))
    .run();
    
  return true;
}

/**
 * Get the default patient status
 */
export function getDefaultPatientStatus(): PatientStatus | undefined {
  const db = getDb();
  return db
    .select()
    .from(patientStatuses)
    .where(eq(patientStatuses.isDefault, true))
    .get();
}

/**
 * Set a status as the default (removes default from other statuses)
 * Cannot set a deleted status as default
 */
export function setDefaultPatientStatus(id: number): boolean {
  const db = getDb();
  
  const status = getPatientStatusById(id);
  // Cannot set deleted status as default
  if (!status || status.deletedAt) {
    return false;
  }
  
  // Remove default from all statuses
  db.update(patientStatuses)
    .set({ 
      isDefault: false,
      updatedAt: new Date().toISOString()
    })
    .where(eq(patientStatuses.isDefault, true))
    .run();
  
  // Set the new default
  db.update(patientStatuses)
    .set({ 
      isDefault: true,
      updatedAt: new Date().toISOString()
    })
    .where(eq(patientStatuses.id, id))
    .run();
    
  return true;
}

/**
 * Setup IPC handlers for patient status operations
 */
export function setupPatientStatusIpcHandlers(): void {
  // Get all statuses (including deleted for dictionary management)
  ipcMain.handle("db:patientStatuses:getAll", async (_e, includeDeleted: boolean = true) => {
    return getAllPatientStatuses(includeDeleted);
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

  // Soft delete
  ipcMain.handle("db:patientStatuses:delete", async (_e, id: number) => {
    return deletePatientStatus(id);
  });

  // Restore from soft delete
  ipcMain.handle("db:patientStatuses:restore", async (_e, id: number) => {
    return restorePatientStatus(id);
  });

  ipcMain.handle("db:patientStatuses:getDefault", async () => {
    return getDefaultPatientStatus();
  });

  ipcMain.handle("db:patientStatuses:setDefault", async (_e, id: number) => {
    return setDefaultPatientStatus(id);
  });
}

