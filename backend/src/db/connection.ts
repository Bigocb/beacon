import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// SQLite database connection
const isDev = process.env.NODE_ENV === 'development';
const dbPath = isDev
  ? path.join(process.cwd(), 'beacon.db')
  : path.join(process.env.HOME || process.env.USERPROFILE || '.', '.beacon', 'beacon.db');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 [Database] Created directory: ${dbDir}`);
}

console.log(`📊 [Database] Connecting to: ${dbPath}`);

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// Pool-like interface for compatibility with existing code
const pool = {
  query: async (sql: string, params?: any[]): Promise<{ rows: any[] }> => {
    try {
      const database = getDb();
      // Check if this is a migration (contains multiple statements or DDL)
      if ((sql.includes('CREATE') || sql.includes('ALTER')) && sql.includes(';')) {
        // Use exec() for migrations - handles multiple statements
        database.exec(sql);
        return { rows: [] };
      }

      // Detect statement type
      const trimmed = sql.trim().toUpperCase();
      const isInsert = trimmed.startsWith('INSERT');
      const isUpdate = trimmed.startsWith('UPDATE');
      const isDelete = trimmed.startsWith('DELETE');
      const isDml = isInsert || isUpdate || isDelete;

      const stmt = database.prepare(sql);
      if (isDml) {
        // DML statements: use run() and return empty rows
        stmt.run(...(params || []));
        return { rows: [] };
      } else {
        // SELECT statements: use all()
        const rows = stmt.all(...(params || []));
        return { rows };
      }
    } catch (error: any) {
      // Don't log duplicate column errors - they're expected during migrations
      if (!error.message?.includes('duplicate column')) {
        console.error('❌ [Database] Query error:', error);
      }
      throw error;
    }
  },

  connect: async () => {
    return {
      query: async (sql: string, params?: any[]): Promise<{ rows: any[] }> => {
        return pool.query(sql, params);
      },
      release: () => {},
    };
  },

  end: async () => {
    if (db) {
      db.close();
      console.log('✅ [Database] Connection closed');
    }
  },
};

export default pool;
