import { eq } from 'drizzle-orm';
import { ipcMain } from 'electron';
import { getDb } from '../connection';
import { sessionData } from '../models';

/**
 * Get session value
 */
export function getSessionData(key: string): any {
  const db = getDb();
  const row = db.select().from(sessionData).where(eq(sessionData.key, key)).get();
  
  if (!row || !row.value) return null;
  
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

/**
 * Set session value
 */
export function setSessionData(key: string, value: any): void {
  const db = getDb();
  const valueStr = value === null ? null : (typeof value === 'string' ? value : JSON.stringify(value));
  
  db.insert(sessionData)
    .values({
      key,
      value: valueStr,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: sessionData.key,
      set: {
        value: valueStr,
        updatedAt: new Date().toISOString(),
      },
    })
    .run();
}

/**
 * Delete session data
 */
export function deleteSessionData(key: string): void {
  const db = getDb();
  db.delete(sessionData).where(eq(sessionData.key, key)).run();
}

/**
 * Clear all session data
 */
export function clearAllSessionData(): void {
  const db = getDb();
  db.delete(sessionData).run();
}

/**
 * Setup IPC handlers for session operations
 */
export function setupSessionIpcHandlers(): void {
  ipcMain.handle("db:session:get", async (_e, key: string) => {
    return getSessionData(key);
  });

  ipcMain.handle("db:session:getAll", async () => {
    return {
      currentDoctor: getSessionData('currentDoctor') || null,
    };
  });

  ipcMain.handle("db:session:set", async (_e, key: string, value: any) => {
    setSessionData(key, value);
  });
}
