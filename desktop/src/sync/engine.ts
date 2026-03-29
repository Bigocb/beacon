import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export interface SyncResult {
  success: boolean;
  conflicts?: any[];
  server_state?: any;
  error?: string;
}

// GraphQL helper for sync queries
async function graphqlQuery(query: string, variables?: any, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.post(`${BACKEND_URL}/graphql`, { query, variables }, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data;
}

/**
 * Fetch latest saves from backend API
 * Replaces local sync queue - directly fetches server state
 */
export async function performSync(
  userUuid: string,
  token: string
): Promise<SyncResult> {
  try {
    console.log('🔄 [Sync] Starting sync for user:', userUuid);

    // Fetch latest saves from backend GraphQL API
    const query = `
      query {
        saves(limit: 100) {
          saves {
            id
            folder_id
            world_name
            version
            game_mode
            difficulty
            notes
            status
            custom_tags
          }
          total
        }
      }
    `;

    const result = await graphqlQuery(query, {}, token);
    const saves = result.saves?.saves || [];

    console.log(`✅ [Sync] Fetched ${saves.length} saves from backend`);

    return {
      success: true,
      server_state: {
        saves,
      },
    };
  } catch (error: any) {
    console.error('❌ [Sync] Error:', error.message);
    return {
      success: false,
      error: error.message || 'Sync failed',
    };
  }
}

/**
 * Start periodic sync to keep saves updated from backend
 * Interval runs independently without local queue persistence
 */
export async function startPeriodicSync(
  userUuid: string,
  token: string,
  intervalMs: number = 30000
) {
  const sync = async () => {
    const result = await performSync(userUuid, token);
    if (!result.success) {
      console.error('❌ Periodic sync failed:', result.error);
    } else {
      console.log('✅ Sync completed successfully');
    }
  };

  // Perform initial sync
  await sync();

  // Schedule periodic syncs
  const interval = setInterval(sync, intervalMs);

  return () => clearInterval(interval);
}
