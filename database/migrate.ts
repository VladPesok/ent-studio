import { getDb, getRawDb } from './connection';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import crypto from 'crypto';

interface MigrationEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface MigrationJournal {
  version: string;
  dialect: string;
  entries: MigrationEntry[];
}

/**
 * Get the migrations folder path
 * Works in both development and production (bundled) environments
 */
function getMigrationsPath(): string {
  const possiblePaths = [
    // Production: relative to app.asar
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'main', 'migrations'),
    // Production: unpacked
    path.join(process.resourcesPath, 'app', 'dist-electron', 'main', 'migrations'),
    // Development: dist-electron location
    path.join(app.getAppPath(), 'dist-electron', 'main', 'migrations'),
    // Development: source location
    path.join(app.getAppPath(), 'database', 'migrations'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Found migrations folder at:', p);
      return p;
    }
  }

  throw new Error(`Migrations folder not found. Searched paths:\n${possiblePaths.join('\n')}`);
}

/**
 * Ensure migrations tracking table exists
 */
function ensureMigrationsTable(): void {
  const rawDb = getRawDb();
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
}

/**
 * Check if a migration has already been applied
 */
function isMigrationApplied(hash: string): boolean {
  const rawDb = getRawDb();
  const result = rawDb.prepare(`
    SELECT id FROM "__drizzle_migrations" WHERE hash = ?
  `).get(hash);
  return !!result;
}

/**
 * Mark a migration as applied
 */
function markMigrationApplied(hash: string): void {
  const rawDb = getRawDb();
  rawDb.prepare(`
    INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)
  `).run(hash, new Date().toISOString());
}

/**
 * Parse SQL migration file and split by statement breakpoints
 */
function parseMigrationStatements(sql: string): string[] {
  // Split by Drizzle's statement breakpoint marker
  const statements = sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => {
      // Keep non-empty statements
      if (s.length === 0) return false;
      
      // Remove pure comment blocks (all lines are comments or empty)
      const lines = s.split('\n').map(l => l.trim());
      const hasActualSql = lines.some(line => 
        line.length > 0 && !line.startsWith('--')
      );
      
      return hasActualSql;
    });
  
  return statements;
}

/**
 * Execute a single SQL statement, handling "already exists" errors gracefully
 */
function executeStatement(statement: string): { success: boolean; skipped: boolean; error?: string } {
  const rawDb = getRawDb();
  
  try {
    rawDb.exec(statement);
    return { success: true, skipped: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if this is an "already exists" type error - schema is already in desired state
    if (errorMessage.includes('already exists') || 
        errorMessage.includes('duplicate column name') ||
        errorMessage.includes('UNIQUE constraint failed')) {
      console.log(`  Skipped (already exists): ${statement.substring(0, 50)}...`);
      return { success: true, skipped: true };
    }
    
    return { success: false, skipped: false, error: errorMessage };
  }
}

/**
 * Run all pending migrations
 * This is automatically called during app initialization
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');
  
  try {
    const migrationsFolder = getMigrationsPath();
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    
    if (!fs.existsSync(journalPath)) {
      throw new Error(`Migration journal not found at: ${journalPath}`);
    }
    
    const journal: MigrationJournal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
    
    // Ensure migrations tracking table exists
    ensureMigrationsTable();
    
    // Process each migration
    for (const entry of journal.entries) {
      const migrationFile = path.join(migrationsFolder, `${entry.tag}.sql`);
      
      if (!fs.existsSync(migrationFile)) {
        console.warn(`Migration file not found: ${migrationFile}, skipping...`);
        continue;
      }
      
      const sql = fs.readFileSync(migrationFile, 'utf-8');
      const hash = crypto.createHash('sha256').update(sql).digest('hex');
      
      // Check if already applied
      if (isMigrationApplied(hash)) {
        console.log(`Migration ${entry.tag} already applied, skipping...`);
        continue;
      }
      
      console.log(`Applying migration: ${entry.tag}`);
      
      // Parse and execute statements
      const statements = parseMigrationStatements(sql);
      let allSucceeded = true;
      
      for (const statement of statements) {
        const result = executeStatement(statement);
        if (!result.success) {
          console.error(`  Failed: ${result.error}`);
          allSucceeded = false;
          break;
        }
      }
      
      if (allSucceeded) {
        markMigrationApplied(hash);
        console.log(`Migration ${entry.tag} completed`);
      } else {
        throw new Error(`Migration ${entry.tag} failed`);
      }
    }
    
    console.log('All migrations completed successfully');
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
    const exists = rawDb.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='__drizzle_migrations'
    `).get();
    
    if (!exists) {
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
