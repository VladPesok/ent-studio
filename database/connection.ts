import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import { app } from 'electron';
import * as schema from './models';

let db: BetterSQLite3Database<typeof schema> | null = null;
let sqlite: Database.Database | null = null;

/**
 * Get the database instance (with Drizzle ORM)
 * Creates the connection if it doesn't exist
 */
export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Get the raw SQLite database instance
 * Useful for operations that require direct SQLite access
 */
export function getRawDb(): Database.Database {
  if (!sqlite) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return sqlite;
}

/**
 * Initialize the database connection
 * This should be called once at app startup
 */
export function initializeDatabase(): BetterSQLite3Database<typeof schema> {
  if (db) {
    console.log('Database already initialized');
    return db;
  }

  const appDataFolder = path.join(app.getPath("userData"), "appData");
  const dbPath = path.join(appDataFolder, "ent-studio.db");

  console.log('Initializing database at:', dbPath);

  // Create raw SQLite connection
  sqlite = new Database(dbPath);
  
  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');
  
  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');
  
  // Create Drizzle instance with schema
  db = drizzle(sqlite, { schema });
  
  console.log('Database initialized successfully');
  
  return db;
}

/**
 * Close the database connection
 * This should be called when the app is closing
 */
export function closeDatabase(): void {
  if (sqlite) {
    try {
      sqlite.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error);
    } finally {
      db = null;
      sqlite = null;
    }
  }
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null && sqlite !== null;
}

/**
 * Get database file path
 */
export function getDatabasePath(): string {
  const appDataFolder = path.join(app.getPath("userData"), "appData");
  return path.join(appDataFolder, "ent-studio.db");
}

