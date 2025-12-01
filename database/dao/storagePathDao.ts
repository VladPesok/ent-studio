import { eq } from 'drizzle-orm';
import { ipcMain, app, dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '../connection';
import { storagePaths, patients } from '../models';
import type { StoragePath } from '../models';

/**
 * Get default patients root path
 */
export function getDefaultPatientsRoot(): string {
  return path.join(app.getPath("userData"), "appData", "patients");
}

/**
 * Get all storage paths
 */
export function getAllStoragePaths(): StoragePath[] {
  const db = getDb();
  return db.select().from(storagePaths).all();
}

/**
 * Get active storage path
 */
export function getActiveStoragePath(): StoragePath | null {
  const db = getDb();
  return db.select().from(storagePaths).where(eq(storagePaths.isActive, true)).get() || null;
}

/**
 * Get active patients root (returns active path or default)
 */
export function getActivePatientsRoot(): string {
  const active = getActiveStoragePath();
  return active ? active.path : getDefaultPatientsRoot();
}

/**
 * Get all possible patient root paths (for searching)
 */
export function getAllPatientRoots(): string[] {
  const paths = getAllStoragePaths();
  const defaultPath = getDefaultPatientsRoot();
  
  const allPaths = new Set<string>();
  allPaths.add(defaultPath);
  
  for (const p of paths) {
    allPaths.add(p.path);
  }
  
  return Array.from(allPaths);
}

/**
 * Resolve a patient folder name to its full path
 * Searches all known storage locations to find where the folder actually exists
 */
export async function resolvePatientFolderPath(folderName: string): Promise<string | null> {
  // If folderName is already an absolute path and exists, use it directly
  if (path.isAbsolute(folderName)) {
    try {
      await fs.access(folderName);
      return folderName;
    } catch {
      // Path doesn't exist, try to extract folder name and search
      folderName = path.basename(folderName);
    }
  }
  
  const allRoots = getAllPatientRoots();
  
  // Search in all storage locations
  for (const root of allRoots) {
    const fullPath = path.join(root, folderName);
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      // Not found in this location, continue searching
    }
  }
  
  // Not found anywhere - return path in active storage (for new patients)
  return path.join(getActivePatientsRoot(), folderName);
}

/**
 * Sync version for cases where async is not possible
 */
export function resolvePatientFolderPathSync(folderName: string): string {
  const fsSync = require('fs');
  
  // If folderName is already an absolute path and exists, use it directly
  if (path.isAbsolute(folderName)) {
    try {
      fsSync.accessSync(folderName);
      return folderName;
    } catch {
      // Path doesn't exist, try to extract folder name and search
      folderName = path.basename(folderName);
    }
  }
  
  const allRoots = getAllPatientRoots();
  
  // Search in all storage locations
  for (const root of allRoots) {
    const fullPath = path.join(root, folderName);
    try {
      fsSync.accessSync(fullPath);
      return fullPath;
    } catch {
      // Not found in this location, continue searching
    }
  }
  
  // Not found anywhere - return path in active storage (for new patients)
  return path.join(getActivePatientsRoot(), folderName);
}

/**
 * Add new storage path
 */
export function addStoragePath(pathStr: string): StoragePath {
  const db = getDb();
  
  // Check if path already exists
  const existing = db.select().from(storagePaths).where(eq(storagePaths.path, pathStr)).get();
  if (existing) {
    return existing;
  }
  
  db.insert(storagePaths)
    .values({ path: pathStr, isActive: false })
    .run();
  
  return db.select().from(storagePaths).where(eq(storagePaths.path, pathStr)).get()!;
}

/**
 * Set active storage path
 */
export function setActiveStoragePath(id: number): void {
  const db = getDb();
  
  // Deactivate all paths
  db.update(storagePaths).set({ isActive: false }).run();
  
  // Activate selected path
  db.update(storagePaths).set({ isActive: true }).where(eq(storagePaths.id, id)).run();
}

/**
 * Remove storage path (only if not active and has no patients)
 */
export function removeStoragePath(id: number): { success: boolean; error?: string } {
  const db = getDb();
  
  const storagePath = db.select().from(storagePaths).where(eq(storagePaths.id, id)).get();
  if (!storagePath) {
    return { success: false, error: 'Шлях не знайдено' };
  }
  
  if (storagePath.isActive) {
    return { success: false, error: 'Неможливо видалити активний шлях' };
  }
  
  db.delete(storagePaths).where(eq(storagePaths.id, id)).run();
  return { success: true };
}

/**
 * Calculate folder size recursively
 */
async function getFolderSize(folderPath: string): Promise<number> {
  let totalSize = 0;
  
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(folderPath, entry.name);
      
      if (entry.isDirectory()) {
        totalSize += await getFolderSize(entryPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(entryPath);
        totalSize += stats.size;
      }
    }
  } catch {
    // Folder doesn't exist or can't be read
  }
  
  return totalSize;
}

/**
 * Count patients in a folder
 */
async function countPatientsInFolder(folderPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    // Count only directories (patient folders follow pattern Name_Surname_YYYY-MM-DD)
    return entries.filter(e => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

/**
 * Get storage statistics for a path
 */
export async function getStorageStats(pathStr: string): Promise<{ patientCount: number; totalSize: number }> {
  const patientCount = await countPatientsInFolder(pathStr);
  const totalSize = await getFolderSize(pathStr);
  
  return { patientCount, totalSize };
}

/**
 * Get all storage paths with statistics
 */
export async function getAllStoragePathsWithStats(): Promise<Array<StoragePath & { patientCount: number; totalSize: number }>> {
  const paths = getAllStoragePaths();
  const defaultPath = getDefaultPatientsRoot();
  
  // Ensure default path is in the list
  const hasDefault = paths.some(p => p.path === defaultPath);
  
  const result: Array<StoragePath & { patientCount: number; totalSize: number }> = [];
  
  // Add default path first if not in DB
  if (!hasDefault) {
    const stats = await getStorageStats(defaultPath);
    result.push({
      id: 0, // Special ID for default path
      path: defaultPath,
      isActive: paths.length === 0, // Active by default if no paths configured
      createdAt: new Date().toISOString(),
      ...stats,
    });
  }
  
  // Add all DB paths with stats
  for (const p of paths) {
    const stats = await getStorageStats(p.path);
    result.push({ ...p, ...stats });
  }
  
  return result;
}

/**
 * Setup IPC handlers for storage path operations
 */
export function setupStoragePathIpcHandlers(): void {
  ipcMain.handle("db:storagePaths:getAll", async () => {
    return getAllStoragePathsWithStats();
  });

  ipcMain.handle("db:storagePaths:getActive", async () => {
    return getActivePatientsRoot();
  });

  ipcMain.handle("db:storagePaths:add", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Оберіть папку для збереження даних пацієнтів",
    });
    
    if (canceled || !filePaths.length) {
      return { success: false, canceled: true };
    }
    
    const selectedPath = filePaths[0];
    
    // Create patients subfolder if it doesn't exist
    const patientsPath = path.join(selectedPath, "patients");
    await fs.mkdir(patientsPath, { recursive: true });
    
    const storagePath = addStoragePath(patientsPath);
    
    // Automatically set new folder as active
    setActiveStoragePath(storagePath.id);
    
    return { success: true, storagePath };
  });

  ipcMain.handle("db:storagePaths:setActive", async (_e, id: number) => {
    // If id is 0, it's the default path - add it to DB first
    if (id === 0) {
      const defaultPath = getDefaultPatientsRoot();
      const added = addStoragePath(defaultPath);
      setActiveStoragePath(added.id);
      // Ensure folder exists
      await fs.mkdir(defaultPath, { recursive: true });
    } else {
      setActiveStoragePath(id);
      // Ensure folder exists
      const storagePath = getAllStoragePaths().find(p => p.id === id);
      if (storagePath) {
        await fs.mkdir(storagePath.path, { recursive: true });
      }
    }
  });

  ipcMain.handle("db:storagePaths:openInExplorer", async (_e, pathStr: string) => {
    const { shell } = await import('electron');
    await shell.openPath(pathStr);
  });
}

