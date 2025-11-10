import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb, getRawDb } from './connection';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run all pending migrations
 * This is automatically called during app initialization
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');
  
  try {
    const db = getDb();
    
    // Run migrations from the migrations folder
    migrate(db, {
      migrationsFolder: path.join(__dirname, 'migrations'),
    });
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Check if migrations are needed
 */
export function checkMigrationStatus(): { needsMigration: boolean; appliedMigrations: number } {
  try {
    const rawDb = getRawDb();
    
    // Check if migrations table exists
    const tableExists = rawDb.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='__drizzle_migrations'
    `).get();
    
    if (!tableExists) {
      return { needsMigration: true, appliedMigrations: 0 };
    }
    
    // Count applied migrations
    const result = rawDb.prepare(`
      SELECT COUNT(*) as count FROM __drizzle_migrations
    `).get() as { count: number };
    
    return {
      needsMigration: false,
      appliedMigrations: result.count,
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return { needsMigration: true, appliedMigrations: 0 };
  }
}

/**
 * Get list of applied migrations
 */
export function getAppliedMigrations(): Array<{ id: number; hash: string; createdAt: string }> {
  try {
    const rawDb = getRawDb();
    
    const migrations = rawDb.prepare(`
      SELECT id, hash, created_at as createdAt 
      FROM __drizzle_migrations 
      ORDER BY id
    `).all() as Array<{ id: number; hash: string; createdAt: string }>;
    
    return migrations;
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    return [];
  }
}

