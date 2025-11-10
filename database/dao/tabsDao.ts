import { eq } from 'drizzle-orm';
import { getDb } from '../connection';
import { tabs, type Tab, type NewTab } from '../models';

/**
 * Get all tabs
 */
export function getAllTabs(): Tab[] {
  const db = getDb();
  return db.select().from(tabs).orderBy(tabs.displayOrder).all();
}

/**
 * Get tab by folder name
 */
export function getTabByFolder(folder: string): Tab | undefined {
  const db = getDb();
  return db.select().from(tabs).where(eq(tabs.folder, folder)).get();
}

/**
 * Create tab
 */
export function createTab(name: string, folder: string, displayOrder: number = 0): number {
  const db = getDb();
  const result = db.insert(tabs).values({ name, folder, displayOrder }).run();
  return Number(result.lastInsertRowid);
}

/**
 * Update tabs configuration
 */
export function updateTabs(tabsList: Array<{ name: string; folder: string }>): void {
  const db = getDb();
  
  // Delete all existing tabs
  db.delete(tabs).run();
  
  // Insert new tabs with display order
  tabsList.forEach((tab, index) => {
    db.insert(tabs).values({
      name: tab.name,
      folder: tab.folder,
      displayOrder: index,
    }).run();
  });
}

/**
 * Delete tab
 */
export function deleteTab(id: number): void {
  const db = getDb();
  db.delete(tabs).where(eq(tabs.id, id)).run();
}

/**
 * Initialize default tabs if none exist
 */
export function initializeDefaultTabs(): void {
  const db = getDb();
  const existingTabs = getAllTabs();
  
  if (existingTabs.length === 0) {
    const defaultTabs = [
      { name: 'video_materials', folder: 'video', displayOrder: 1 },
      { name: 'voice_report', folder: 'audio', displayOrder: 2 },
      { name: 'tests', folder: 'tests', displayOrder: 3 },
    ];
    
    defaultTabs.forEach(tab => {
      db.insert(tabs).values(tab).run();
    });
  }
}

