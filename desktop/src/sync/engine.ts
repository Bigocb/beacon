import axios from 'axios';
import db, { queries } from '../db/sqlite';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export interface SyncResult {
  success: boolean;
  conflicts?: any[];
  server_state?: any;
  error?: string;
}

export async function performSync(
  userUuid: string,
  token: string
): Promise<SyncResult> {
  try {
    // Get queued changes from SQLite
    const queue = queries.getQueuedChanges.all() as any[];

    // Prepare payload
    const payload = {
      saves: queue
        .filter((q) => q.operation !== 'delete')
        .map((q) => JSON.parse(q.data)),
      deletes: {
        saves: queue
          .filter((q) => q.operation === 'delete')
          .map((q) => q.save_id),
      },
    };

    // Send to server
    const response = await axios.post(`${BACKEND_URL}/api/sync`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = response.data;

    // Update local DB with server state
    if (result.server_state && result.server_state.saves) {
      const updateStmt = db.transaction((saves: any[]) => {
        for (const save of saves) {
          queries.updateSave.run(
            save.notes || null,
            save.status || 'active',
            save.custom_tags ? JSON.stringify(save.custom_tags) : null,
            save.id
          );
        }
      });

      updateStmt(result.server_state.saves);
    }

    // Clear sync queue
    queries.clearQueue.run();

    return {
      success: true,
      conflicts: result.conflicts,
      server_state: result.server_state,
    };
  } catch (error: any) {
    console.error('Sync error:', error);
    return {
      success: false,
      error: error.message || 'Sync failed',
    };
  }
}

export async function startPeriodicSync(
  userUuid: string,
  token: string,
  intervalMs: number = 30000
) {
  const sync = async () => {
    const result = await performSync(userUuid, token);
    if (!result.success) {
      console.error('Periodic sync failed:', result.error);
    } else {
      console.log('Sync completed successfully');
    }
  };

  // Perform initial sync
  await sync();

  // Schedule periodic syncs
  const interval = setInterval(sync, intervalMs);

  return () => clearInterval(interval);
}
