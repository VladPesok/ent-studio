import { eq, isNull, isNotNull } from 'drizzle-orm';
import { ipcMain } from 'electron';
import { getDb } from '../connection';
import { doctors, diagnoses, type Doctor } from '../models';

/**
 * Get all doctors (active only by default)
 */
export function getAllDoctors(includeDeleted: boolean = false): Doctor[] {
  const db = getDb();
  if (includeDeleted) {
    return db.select().from(doctors).orderBy(doctors.name).all();
  }
  return db.select().from(doctors).where(isNull(doctors.deletedAt)).orderBy(doctors.name).all();
}

/**
 * Get doctor by ID
 */
export function getDoctorById(id: number): Doctor | undefined {
  const db = getDb();
  return db.select().from(doctors).where(eq(doctors.id, id)).get();
}

/**
 * Get doctor by name
 */
export function getDoctorByName(name: string): Doctor | undefined {
  const db = getDb();
  return db.select().from(doctors).where(eq(doctors.name, name)).get();
}

/**
 * Create a new doctor
 * Returns the doctor ID
 */
export function createDoctor(name: string): number {
  const db = getDb();
  
  // Check if already exists (including soft-deleted)
  const existing = getDoctorByName(name);
  if (existing) {
    // If soft-deleted, restore it
    if (existing.deletedAt) {
      db.update(doctors)
        .set({ deletedAt: null, updatedAt: new Date().toISOString() })
        .where(eq(doctors.id, existing.id))
        .run();
    }
    return existing.id;
  }
  
  const result = db.insert(doctors).values({ name }).run();
  return Number(result.lastInsertRowid);
}

/**
 * Get or create doctor by name
 * Returns the doctor ID
 */
export function getOrCreateDoctor(name: string): number | null {
  if (!name) return null;
  
  const existing = getDoctorByName(name);
  if (existing) {
    return existing.id;
  }
  
  return createDoctor(name);
}

/**
 * Update doctor name
 */
export function updateDoctor(id: number, name: string): void {
  const db = getDb();
  db.update(doctors)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(doctors.id, id))
    .run();
}

/**
 * Soft delete doctor
 */
export function softDeleteDoctor(id: number): void {
  const db = getDb();
  db.update(doctors)
    .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(doctors.id, id))
    .run();
}

/**
 * Restore soft-deleted doctor
 */
export function restoreDoctor(id: number): void {
  const db = getDb();
  db.update(doctors)
    .set({ deletedAt: null, updatedAt: new Date().toISOString() })
    .where(eq(doctors.id, id))
    .run();
}

/**
 * Hard delete doctor (permanent)
 */
export function deleteDoctor(id: number): void {
  const db = getDb();
  db.delete(doctors).where(eq(doctors.id, id)).run();
}

/**
 * Get all diagnoses (helper for dict handlers)
 */
function getAllDiagnosesHelper(includeDeleted: boolean = false) {
  const db = getDb();
  if (includeDeleted) {
    return db.select().from(diagnoses).orderBy(diagnoses.name).all();
  }
  return db.select().from(diagnoses).where(isNull(diagnoses.deletedAt)).orderBy(diagnoses.name).all();
}

/**
 * Create diagnosis (helper for dict handlers)
 */
function createDiagnosisEntry(name: string): number {
  const db = getDb();
  const existing = db.select().from(diagnoses).where(eq(diagnoses.name, name)).get();
  if (existing) {
    // If soft-deleted, restore it
    if (existing.deletedAt) {
      db.update(diagnoses)
        .set({ deletedAt: null, updatedAt: new Date().toISOString() })
        .where(eq(diagnoses.id, existing.id))
        .run();
    }
    return existing.id;
  }
  const result = db.insert(diagnoses).values({ name }).run();
  return Number(result.lastInsertRowid);
}

/**
 * Setup IPC handlers for dictionary operations (doctors + diagnoses)
 */
export function setupDictIpcHandlers(): void {
  // Get active dictionaries for dropdowns
  ipcMain.handle("db:dict:get", async () => {
    const doctorsList = getAllDoctors(false);
    const diagnosesList = getAllDiagnosesHelper(false);
    return {
      doctors: doctorsList.map(d => d.name),
      diagnosis: diagnosesList.map(d => d.name),
    };
  });

  ipcMain.handle("db:dict:addDoctor", async (_e, name: string) => {
    return createDoctor(name);
  });

  ipcMain.handle("db:dict:addDiagnosis", async (_e, name: string) => {
    return createDiagnosisEntry(name);
  });

  // === Dictionary Management IPC Handlers ===

  // Get all doctors with full details (including deleted)
  ipcMain.handle("db:dict:doctors:getAll", async (_e, includeDeleted: boolean = true) => {
    return getAllDoctors(includeDeleted);
  });

  // Update doctor name
  ipcMain.handle("db:dict:doctors:update", async (_e, id: number, name: string) => {
    updateDoctor(id, name);
    return getDoctorById(id);
  });

  // Soft delete doctor
  ipcMain.handle("db:dict:doctors:delete", async (_e, id: number) => {
    softDeleteDoctor(id);
    return { success: true };
  });

  // Restore doctor
  ipcMain.handle("db:dict:doctors:restore", async (_e, id: number) => {
    restoreDoctor(id);
    return getDoctorById(id);
  });

  // Get all diagnoses with full details (including deleted)
  ipcMain.handle("db:dict:diagnoses:getAll", async (_e, includeDeleted: boolean = true) => {
    return getAllDiagnosesHelper(includeDeleted);
  });

  // Update diagnosis name
  ipcMain.handle("db:dict:diagnoses:update", async (_e, id: number, name: string) => {
    const db = getDb();
    db.update(diagnoses)
      .set({ name, updatedAt: new Date().toISOString() })
      .where(eq(diagnoses.id, id))
      .run();
    return db.select().from(diagnoses).where(eq(diagnoses.id, id)).get();
  });

  // Soft delete diagnosis
  ipcMain.handle("db:dict:diagnoses:delete", async (_e, id: number) => {
    const db = getDb();
    db.update(diagnoses)
      .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(diagnoses.id, id))
      .run();
    return { success: true };
  });

  // Restore diagnosis
  ipcMain.handle("db:dict:diagnoses:restore", async (_e, id: number) => {
    const db = getDb();
    db.update(diagnoses)
      .set({ deletedAt: null, updatedAt: new Date().toISOString() })
      .where(eq(diagnoses.id, id))
      .run();
    return db.select().from(diagnoses).where(eq(diagnoses.id, id)).get();
  });
}
