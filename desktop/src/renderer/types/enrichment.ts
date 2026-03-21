/**
 * Phase 1: Enrichment & Analytics Frontend Types
 * React component types and UI-specific interfaces
 */

import { ReactNode } from 'react';

// ============================================
// RE-EXPORT BACKEND TYPES
// ============================================
// In a real setup, these would be shared from a common package
// For now, we duplicate the data model types

export type NoteType = 'general' | 'milestone' | 'issue' | 'achievement';
export type WorldType = 'survival' | 'creative' | 'adventure' | 'spectator' | 'modded';

// ============================================
// TAG UI TYPES
// ============================================

export interface TagUI {
  id: string;
  name: string;
  color?: string;
  count?: number; // How many notes use this tag
}

export interface TagInputProps {
  placeholder?: string;
  onAddTag: (tagName: string, color?: string) => void;
  existingTags?: TagUI[];
  disabled?: boolean;
}

// ============================================
// NOTE UI TYPES
// ============================================

export interface NoteUI {
  id: string;
  title?: string;
  content: string;
  type: NoteType;
  timestamp: Date;
  tags: TagUI[];
  created_at: Date;
  updated_at: Date;
  isEditing?: boolean;
}

export interface NoteCardProps {
  note: NoteUI;
  onEdit: (note: NoteUI) => void;
  onDelete: (noteId: string) => void;
  onAddTag: (noteId: string, tag: TagUI) => void;
  onRemoveTag: (noteId: string, tagId: string) => void;
  expandable?: boolean;
}

export interface NoteEditorProps {
  note?: NoteUI;
  onSave: (note: Omit<NoteUI, 'id'>) => Promise<void>;
  onCancel: () => void;
  saveName: string;
  tags: TagUI[];
}

export interface NoteFilterOptions {
  searchText: string;
  noteTypes: NoteType[];
  tagIds: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ============================================
// WORLD METADATA UI TYPES
// ============================================

export interface WorldMetadataUI {
  description?: string;
  is_favorite: boolean;
  theme_color?: string;
  world_type: WorldType;
  modpack_name?: string;
  modpack_version?: string;
  project_id?: string;
  archived?: boolean;
}

export interface WorldMetadataFormProps {
  metadata: WorldMetadataUI;
  onSave: (metadata: WorldMetadataUI) => Promise<void>;
  onCancel: () => void;
  worldName: string;
  projects: ProjectUI[];
}

// ============================================
// PROJECT UI TYPES
// ============================================

export interface ProjectUI {
  id: string;
  name: string;
  description?: string;
  save_count: number;
  is_archived: boolean;
  created_at: Date;
}

export interface ProjectListProps {
  projects: ProjectUI[];
  onSelect: (project: ProjectUI) => void;
  onEdit: (project: ProjectUI) => void;
  onDelete: (projectId: string) => void;
  onCreateNew: () => void;
}

// ============================================
// PLAYER ENRICHMENT UI TYPES
// ============================================

export interface PlayerStatsUI {
  uuid: string;
  name?: string;
  playtime_hours: number;
  deaths: number;
  last_updated: Date;
}

export interface PlayerStatsCardProps {
  player: PlayerStatsUI;
  onEdit: (player: PlayerStatsUI) => void;
}

// ============================================
// ANALYTICS UI TYPES
// ============================================

export interface ChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string | string[];
    fill?: boolean;
    [key: string]: any;
  }[];
}

export interface PlaytimeTrendData {
  dates: Date[];
  hours: number[];
}

export interface AnalyticsDashboardProps {
  saveId: string;
  data: ChartData;
  playtimeTrend?: PlaytimeTrendData;
  milestones?: MilestoneUI[];
  loading?: boolean;
}

// ============================================
// MILESTONE UI TYPES
// ============================================

export interface MilestoneUI {
  id: string;
  name: string;
  description?: string;
  target_playtime_hours?: number;
  achieved: boolean;
  achieved_at?: Date;
  progress_percent: number; // 0-100
  position: number;
}

export interface MilestoneListProps {
  milestones: MilestoneUI[];
  onAdd: (milestone: Omit<MilestoneUI, 'id'>) => void;
  onEdit: (milestone: MilestoneUI) => void;
  onDelete: (milestoneId: string) => void;
  onAchieve: (milestoneId: string) => void;
}

// ============================================
// TIMELINE UI TYPES
// ============================================

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description?: string;
  type: 'note' | 'milestone' | 'achievement' | 'first_play' | 'snapshot' | 'issue';
  emoji: string;
  color: string;
  metadata?: {
    noteType?: string;
    achieved?: boolean;
    playtimeHours?: number;
    chunkCount?: number;
  };
}

export interface TimelineProps {
  events: TimelineEvent[];
  startDate?: Date;
  endDate?: Date;
  onSelectEvent: (event: TimelineEvent) => void;
  view?: 'year' | 'month' | 'week'; // Zoom level
}

// ============================================
// COMPOSITE UI TYPES (for pages)
// ============================================

export interface SaveEnrichmentTabProps {
  saveId: string;
  saveName: string;
  onSaveUpdated: () => void;
}

export interface EnrichmentPanelProps {
  saveId: string;
  activeSection: 'notes' | 'metadata' | 'milestones' | 'timeline' | 'analytics';
  onSectionChange: (section: string) => void;
}

// ============================================
// LOADING & ERROR STATES
// ============================================

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  message?: string;
}

export interface EnrichmentLoadingState extends LoadingState {
  notes?: boolean;
  metadata?: boolean;
  analytics?: boolean;
  milestones?: boolean;
}

// ============================================
// FORM STATE TYPES
// ============================================

export interface FormValidationError {
  field: string;
  message: string;
}

export interface NoteFormState {
  title: string;
  content: string;
  type: NoteType;
  timestamp: Date;
  selectedTags: string[];
  errors: FormValidationError[];
}

export interface WorldMetadataFormState {
  description: string;
  is_favorite: boolean;
  theme_color: string;
  world_type: WorldType;
  modpack_name: string;
  modpack_version: string;
  project_id?: string;
  archived: boolean;
  errors: FormValidationError[];
}
