import { eq } from 'drizzle-orm';
import { ipcMain } from 'electron';
import { getDb } from '../connection';
import { settings } from '../models';

/**
 * Get setting value
 */
export function getSetting(key: string): any {
  const db = getDb();
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  
  if (!row) return null;
  
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

/**
 * Set setting value
 */
export function setSetting(key: string, value: any): void {
  const db = getDb();
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  
  db.insert(settings)
    .values({
      key,
      value: valueStr,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: valueStr,
        updatedAt: new Date().toISOString(),
      },
    })
    .run();
}

/**
 * Get all settings
 */
export function getAllSettings(): Record<string, any> {
  const db = getDb();
  const allSettings = db.select().from(settings).all();
  
  const result: Record<string, any> = {};
  for (const setting of allSettings) {
    try {
      result[setting.key] = JSON.parse(setting.value);
    } catch {
      result[setting.key] = setting.value;
    }
  }
  
  return result;
}

/**
 * Delete setting
 */
export function deleteSetting(key: string): void {
  const db = getDb();
  db.delete(settings).where(eq(settings.key, key)).run();
}

/**
 * Setup IPC handlers for settings operations
 */
export function setupSettingsIpcHandlers(): void {
  ipcMain.handle("db:settings:get", async (_e, key: string) => {
    return getSetting(key);
  });

  ipcMain.handle("db:settings:getAll", async () => {
    return {
      theme: getSetting('theme') || 'light',
      locale: getSetting('locale') || 'en',
      praatPath: getSetting('praatPath') || '',
      defaultPatientCard: getSetting('defaultPatientCard') || null,
    };
  });

  ipcMain.handle("db:settings:set", async (_e, key: string, value: any) => {
    setSetting(key, value);
  });
}
