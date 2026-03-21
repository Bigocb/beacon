/**
 * DEPRECATED: PostgreSQL connection
 *
 * This file is kept for compatibility with existing imports.
 * New features should use SQLite (see sqliteNotes.ts)
 *
 * For v0.1, we're using SQLite for all local storage.
 * PostgreSQL is not required for the desktop app.
 */

// Mock pool object for compatibility
// Most endpoints that use this pool are not yet implemented
const mockPool = {
  query: async (sql: string, params?: any[]): Promise<{ rows: any[] }> => {
    console.warn('⚠️  [Backend] PostgreSQL pool not available - feature not implemented');
    return { rows: [] as any[] };
  },

  connect: async () => {
    console.warn('⚠️  [Backend] PostgreSQL pool not available - feature not implemented');
    return {
      query: async (sql: string, params?: any[]): Promise<{ rows: any[] }> => ({ rows: [] as any[] }),
      release: () => {},
    };
  },

  end: async () => {
    console.warn('⚠️  [Backend] PostgreSQL pool not available - feature not implemented');
  },
};

export default mockPool;
