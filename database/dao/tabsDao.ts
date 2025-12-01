import { eq } from 'drizzle-orm';
import { ipcMain } from 'electron';
import { getDb } from '../connection';
import { tabs, type Tab } from '../models';

/**
 * Get all tabs
 */
export function getAllTabs(): Tab[] {
  const db = getDb();
  return db.select().from(tabs).orderBy(tabs.displayOrder).all();
}

/**
 * Get visible tabs only
 */
export function getVisibleTabs(): Tab[] {
  const db = getDb();
  return db.select().from(tabs).where(eq(tabs.isVisible, true)).orderBy(tabs.displayOrder).all();
}

/**
 * Get tab by folder name
 */
export function getTabByFolder(folder: string): Tab | undefined {
  const db = getDb();
  return db.select().from(tabs).where(eq(tabs.folder, folder)).get();
}

/**
 * Create custom tab
 */
export function createTab(name: string, folder: string): Tab {
  const db = getDb();
  const allTabs = getAllTabs();
  const maxOrder = allTabs.length > 0 ? Math.max(...allTabs.map(t => t.displayOrder)) : 0;
  
  db.insert(tabs).values({ 
    name, 
    folder, 
    displayOrder: maxOrder + 1,
    isVisible: true,
    isDefault: false
  }).run();
  
  return db.select().from(tabs).where(eq(tabs.folder, folder)).get()!;
}

/**
 * Update tab name
 */
export function updateTabName(id: number, name: string): void {
  const db = getDb();
  db.update(tabs).set({ name }).where(eq(tabs.id, id)).run();
}

/**
 * Update tab visibility
 */
export function updateTabVisibility(id: number, isVisible: boolean): void {
  const db = getDb();
  db.update(tabs).set({ isVisible }).where(eq(tabs.id, id)).run();
}

/**
 * Reorder tabs
 */
export function reorderTabs(orderedIds: number[]): void {
  const db = getDb();
  orderedIds.forEach((id, index) => {
    db.update(tabs).set({ displayOrder: index }).where(eq(tabs.id, id)).run();
  });
}

/**
 * Update tabs configuration (legacy support for migration)
 */
export function updateTabs(tabsList: Array<{ name: string; folder: string }>): void {
  const db = getDb();
  
  tabsList.forEach((tab, index) => {
    const existing = getTabByFolder(tab.folder);
    if (existing) {
      db.update(tabs).set({ name: tab.name, displayOrder: index }).where(eq(tabs.id, existing.id)).run();
    } else {
      db.insert(tabs).values({
        name: tab.name,
        folder: tab.folder,
        displayOrder: index,
        isVisible: true,
        isDefault: false
      }).run();
    }
  });
}

/**
 * Delete custom tab (only non-default tabs can be deleted)
 */
export function deleteTab(id: number): { success: boolean; error?: string } {
  const db = getDb();
  const tab = db.select().from(tabs).where(eq(tabs.id, id)).get();
  
  if (!tab) {
    return { success: false, error: 'Вкладку не знайдено' };
  }
  
  if (tab.isDefault) {
    return { success: false, error: 'Неможливо видалити стандартну вкладку' };
  }
  
  db.delete(tabs).where(eq(tabs.id, id)).run();
  return { success: true };
}

/**
 * Initialize default tabs if none exist
 */
export function initializeDefaultTabs(): void {
  const db = getDb();
  const existingTabs = getAllTabs();
  
  if (existingTabs.length === 0) {
    const defaultTabs = [
      { name: 'video_materials', folder: 'video', displayOrder: 1, isVisible: true, isDefault: true },
      { name: 'voice_report', folder: 'audio', displayOrder: 2, isVisible: true, isDefault: true },
      { name: 'tests', folder: 'tests', displayOrder: 3, isVisible: true, isDefault: true },
    ];
    
    defaultTabs.forEach(tab => {
      db.insert(tabs).values(tab).run();
    });
  }
}

/**
 * Setup IPC handlers for tabs operations
 */
export function setupTabsIpcHandlers(): void {
  // Get all tabs (for settings management)
  ipcMain.handle("db:tabs:getAll", async () => {
    return getAllTabs();
  });

  // Get visible tabs only (for patient overview)
  ipcMain.handle("db:tabs:getVisible", async () => {
    const tabsList = getVisibleTabs();
    return tabsList.map(t => ({ name: t.name, folder: t.folder }));
  });

  // Add new custom tab
  ipcMain.handle("db:tabs:add", async (_e, name: string, folder: string) => {
    return createTab(name, folder);
  });

  // Rename tab
  ipcMain.handle("db:tabs:rename", async (_e, id: number, name: string) => {
    updateTabName(id, name);
  });

  // Toggle visibility
  ipcMain.handle("db:tabs:setVisibility", async (_e, id: number, isVisible: boolean) => {
    updateTabVisibility(id, isVisible);
  });

  // Reorder tabs
  ipcMain.handle("db:tabs:reorder", async (_e, orderedIds: number[]) => {
    reorderTabs(orderedIds);
  });

  // Delete custom tab
  ipcMain.handle("db:tabs:delete", async (_e, id: number) => {
    return deleteTab(id);
  });

  // Legacy support
  ipcMain.handle("db:tabs:update", async (_e, tabsList: Array<{ name: string; folder: string }>) => {
    // For backwards compatibility - update existing tabs
    const db = getDb();
    tabsList.forEach((tab, index) => {
      const existing = getTabByFolder(tab.folder);
      if (existing) {
        db.update(tabs).set({ name: tab.name, displayOrder: index }).where(eq(tabs.id, existing.id)).run();
      } else {
        db.insert(tabs).values({
          name: tab.name,
          folder: tab.folder,
          displayOrder: index,
          isVisible: true,
          isDefault: false
        }).run();
      }
    });
  });
}
