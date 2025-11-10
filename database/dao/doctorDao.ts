import { eq } from 'drizzle-orm';
import { getDb } from '../connection';
import { doctors, type Doctor, type NewDoctor } from '../models';

/**
 * Get all doctors
 */
export function getAllDoctors(): Doctor[] {
  const db = getDb();
  return db.select().from(doctors).orderBy(doctors.name).all();
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
  
  // Check if already exists
  const existing = getDoctorByName(name);
  if (existing) {
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
 * Update doctor
 */
export function updateDoctor(id: number, name: string): void {
  const db = getDb();
  db.update(doctors)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(doctors.id, id))
    .run();
}

/**
 * Delete doctor
 */
export function deleteDoctor(id: number): void {
  const db = getDb();
  db.delete(doctors).where(eq(doctors.id, id)).run();
}

