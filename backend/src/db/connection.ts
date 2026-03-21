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
    // Silently return empty rows - PostgreSQL is not used in v0.1
    return { rows: [] as any[] };
  },

  connect: async () => {
    return {
      query: async (sql: string, params?: any[]): Promise<{ rows: any[] }> => ({ rows: [] as any[] }),
      release: () => {},
    };
  },

  end: async () => {
    // Silent operation
  },
};

export default mockPool;
