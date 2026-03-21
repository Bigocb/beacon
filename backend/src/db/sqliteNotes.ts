import Database from 'better-sqlite3';
import path from 'path';

// Determine the database file location
// In production, store in app's data directory; in dev, store locally
const isDev = process.env.NODE_ENV === 'development';

let dbPath: string;
if (isDev) {
  dbPath = path.join(process.cwd(), 'beacon-notes.db');
} else {
  // Try to use Electron's app data directory if available
  try {
    const { app } = require('electron');
    dbPath = path.join(app.getPath('userData'), 'beacon-notes.db');
  } catch (e) {
    // Fallback to home directory if not in Electron context
    dbPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'beacon-notes.db');
  }
}

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize notes tables if they don't exist
 */
export function initializeNotesDatabase() {
  try {
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        save_id TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        note_type TEXT DEFAULT 'general',
        timestamp DATETIME NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        deleted_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_notes_save_id ON notes(save_id);
      CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
    `);

    console.log('✅ [SQLite] Notes database initialized:', dbPath);
  } catch (error) {
    console.error('❌ [SQLite] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Query wrapper for SQLite with result formatting
 */
interface QueryResult {
  rows: any[];
  rowCount?: number;
}

export const notesDb = {
  /**
   * Execute a SELECT query
   */
  query: (sql: string, params?: any[]): QueryResult => {
    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...(params || []));
      return { rows };
    } catch (error) {
      console.error('❌ [SQLite] Query error:', error);
      throw error;
    }
  },

  /**
   * Execute INSERT, UPDATE, DELETE
   */
  run: (sql: string, params?: any[]): QueryResult => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(...(params || []));
      return { rows: [], rowCount: result.changes };
    } catch (error) {
      console.error('❌ [SQLite] Run error:', error);
      throw error;
    }
  },

  /**
   * Execute multiple statements in a transaction
   */
  transaction: (callback: () => void) => {
    const transaction = db.transaction(callback);
    try {
      transaction();
    } catch (error) {
      console.error('❌ [SQLite] Transaction error:', error);
      throw error;
    }
  },

  /**
   * Close the database connection
   */
  close: () => {
    try {
      db.close();
      console.log('✅ [SQLite] Database connection closed');
    } catch (error) {
      console.error('❌ [SQLite] Failed to close database:', error);
    }
  },
};

export default notesDb;
