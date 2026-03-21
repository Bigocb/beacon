/**
 * Phase 1: Enrichment & Analytics Types
 * Shared TypeScript interfaces for all Phase 1 data structures
 */

// ============================================
// TAGS
// ============================================

export interface Tag {
  id: string;
  user_uuid: string;
  name: string;
  color?: string; // Hex color for UI (e.g., #FF5733)
  created_at: Date;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

// ============================================
// NOTES
// ============================================

export type NoteType = 'general' | 'milestone' | 'issue' | 'achievement';

export interface Note {
  id: string;
  save_id: string;
  title?: string;
  content: string;
  note_type: NoteType;
  timestamp: Date; // When the event occurred (can be in past/future)
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  tags?: Tag[]; // Populated when fetching
}

export interface CreateNoteInput {
  title?: string;
  content: string;
  note_type?: NoteType;
  timestamp: Date;
  tag_ids?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  note_type?: NoteType;
  timestamp?: Date;
  tag_ids?: string[];
}

export interface NoteWithTags extends Note {
  tags: Tag[];
}

// ============================================
// WORLD METADATA
// ============================================

export type WorldType = 'survival' | 'creative' | 'adventure' | 'spectator' | 'modded';

export interface WorldMetadata {
  save_id: string;
  description?: string;
  is_favorite: boolean;
  theme_color?: string; // Hex color for world card UI
  world_type: WorldType;
  modpack_name?: string;
  modpack_version?: string;
  project_id?: string; // FK to projects table
  archived_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWorldMetadataInput {
  description?: string;
  is_favorite?: boolean;
  theme_color?: string;
  world_type: WorldType;
  modpack_name?: string;
  modpack_version?: string;
  project_id?: string;
}

export interface UpdateWorldMetadataInput {
  description?: string;
  is_favorite?: boolean;
  theme_color?: string;
  world_type?: WorldType;
  modpack_name?: string;
  modpack_version?: string;
  project_id?: string;
  archived_at?: Date;
}

// ============================================
// PROJECTS
// ============================================

export interface Project {
  id: string;
  user_uuid: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  archived_at?: Date;
}

// ============================================
// PLAYER ENRICHMENT
// ============================================

export interface PlayerEnrichment {
  id: string;
  save_id: string;
  player_uuid: string; // Minecraft player UUID
  player_name?: string; // Last known username
  total_play_time_ticks: number;
  deaths: number;
  last_updated: Date;
  data_json?: string; // Additional stats as JSON
}

export interface CreatePlayerEnrichmentInput {
  player_uuid: string;
  player_name?: string;
  total_play_time_ticks?: number;
  deaths?: number;
  data_json?: string;
}

export interface UpdatePlayerEnrichmentInput {
  player_name?: string;
  total_play_time_ticks?: number;
  deaths?: number;
  data_json?: string;
}

// ============================================
// ANALYTICS SNAPSHOTS
// ============================================

export interface AnalyticsSnapshot {
  id: string;
  save_id: string;
  snapshot_date: Date;
  play_time_ticks?: number;
  chunk_count?: number;
  entity_count?: number;
  tile_entity_count?: number;
  data_json?: string; // Aggregated stats as JSON
  created_at: Date;
}

export interface CreateAnalyticsSnapshotInput {
  snapshot_date: Date;
  play_time_ticks?: number;
  chunk_count?: number;
  entity_count?: number;
  tile_entity_count?: number;
  data_json?: string;
}

export interface AnalyticsData {
  playTime: number;
  chunkCount: number;
  entityCount: number;
  tileEntityCount: number;
  [key: string]: any;
}

// Chart data structure for Chart.js
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    borderColor?: string | string[];
    backgroundColor?: string | string[];
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointBackgroundColor?: string;
    pointBorderColor?: string | string[];
    pointBorderWidth?: number;
    pointHoverRadius?: number;
    [key: string]: any;
  }>;
}

// ============================================
// MILESTONES
// ============================================

export interface Milestone {
  id: string;
  save_id: string;
  name: string;
  description?: string;
  target_play_time_ticks?: number; // Goal play time in ticks
  achieved_at?: Date;
  position: number; // For ordering
  created_at: Date;
  updated_at: Date;
}

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  target_play_time_ticks?: number;
  position?: number;
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string;
  target_play_time_ticks?: number;
  achieved_at?: Date;
  position?: number;
}

// ============================================
// AGGREGATED SAVE DATA (for frontend)
// ============================================

/**
 * Complete save enrichment data for frontend
 * Combines basic save info with all Phase 1 enrichment
 */
export interface EnrichedSave {
  // Basic save info
  id: string;
  world_name: string;
  version: string;
  game_mode: string;
  difficulty: number;
  seed: bigint;
  play_time_ticks: number;
  last_played: Date;

  // Phase 1 enrichment
  metadata?: WorldMetadata;
  notes?: Note[];
  players?: PlayerEnrichment[];
  milestones?: Milestone[];
  project?: Project;
  latestSnapshot?: AnalyticsSnapshot;
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface PlaytimeStats {
  total_hours: number;
  average_session_minutes: number;
  last_played: Date;
  trend: 'increasing' | 'decreasing' | 'stable'; // Based on recent snapshots
}

export interface WorldStats {
  total_saves: number;
  active_worlds: number;
  archived_worlds: number;
  favorite_count: number;
}

export interface PlayerStats {
  total_players: number;
  average_playtime_hours: number;
  total_deaths: number;
}

export interface DashboardStats {
  playtime: PlaytimeStats;
  worlds: WorldStats;
  players: PlayerStats;
}
