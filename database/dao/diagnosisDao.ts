import { eq } from 'drizzle-orm';
import { getDb } from '../connection';
import { diagnoses, type Diagnosis, type NewDiagnosis } from '../models';

/**
 * Get all diagnoses
 */
export function getAllDiagnoses(): Diagnosis[] {
  const db = getDb();
  return db.select().from(diagnoses).orderBy(diagnoses.name).all();
}

/**
 * Get diagnosis by ID
 */
export function getDiagnosisById(id: number): Diagnosis | undefined {
  const db = getDb();
  return db.select().from(diagnoses).where(eq(diagnoses.id, id)).get();
}

/**
 * Get diagnosis by name
 */
export function getDiagnosisByName(name: string): Diagnosis | undefined {
  const db = getDb();
  return db.select().from(diagnoses).where(eq(diagnoses.name, name)).get();
}

/**
 * Create a new diagnosis
 * Returns the diagnosis ID
 */
export function createDiagnosis(name: string): number {
  const db = getDb();
  
  // Check if already exists
  const existing = getDiagnosisByName(name);
  if (existing) {
    return existing.id;
  }
  
  const result = db.insert(diagnoses).values({ name }).run();
  return Number(result.lastInsertRowid);
}

/**
 * Get or create diagnosis by name
 * Returns the diagnosis ID
 */
export function getOrCreateDiagnosis(name: string): number | null {
  if (!name) return null;
  
  const existing = getDiagnosisByName(name);
  if (existing) {
    return existing.id;
  }
  
  return createDiagnosis(name);
}

/**
 * Update diagnosis
 */
export function updateDiagnosis(id: number, name: string): void {
  const db = getDb();
  db.update(diagnoses)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(diagnoses.id, id))
    .run();
}

/**
 * Delete diagnosis
 */
export function deleteDiagnosis(id: number): void {
  const db = getDb();
  db.delete(diagnoses).where(eq(diagnoses.id, id)).run();
}

