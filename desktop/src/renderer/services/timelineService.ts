/**
 * Timeline Service
 * Aggregates timeline events from multiple sources (notes, milestones, analytics)
 */

import axios from 'axios';
import { TimelineEvent, NoteUI, MilestoneUI } from '../types/enrichment';

const API_BASE = 'http://localhost:3000';

// GraphQL helper
async function graphqlQuery(query: string, variables?: any, token?: string | null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.post(`${API_BASE}/graphql`, { query, variables }, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data;
}

// ============================================
// TIMELINE SERVICE
// ============================================

/**
 * Fetch all timeline events for a save
 * Aggregates notes, milestones, and other events into a unified timeline
 * Optionally filter by player UUID
 */
export async function fetchTimelineEvents(saveId: string, playerUUID?: string): Promise<TimelineEvent[]> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    console.log('📅 [Frontend] Fetching timeline events for save:', saveId, playerUUID ? `(player: ${playerUUID})` : '');

    const query = `
      query timelineEvents($saveId: String!) {
        notes(saveId: $saveId) {
          id
          title
          content
          note_type
          timestamp
        }
        milestones(saveId: $saveId) {
          id
          name
          description
          achieved_at
          created_at
        }
      }
    `;

    const result = await graphqlQuery(query, { saveId }, token);
    const rawNotes = result.notes || [];
    const rawMilestones = result.milestones || [];

    console.log(`✅ [Frontend] Fetched ${rawNotes.length} notes and ${rawMilestones.length} milestones`);

    const events: TimelineEvent[] = [];

    // Convert notes to timeline events
    console.log('🔄 [Frontend] Converting notes to timeline events...');
    rawNotes.forEach((note: any) => {
      const typeEmojis: Record<string, string> = {
        'general': '📝',
        'milestone': '🎯',
        'achievement': '🏆',
        'issue': '⚠️',
      };

      const typeColors: Record<string, string> = {
        'general': '#60a5fa',
        'milestone': '#f59e0b',
        'achievement': '#10b981',
        'issue': '#ef4444',
      };

      const noteType = note.note_type || 'general';
      events.push({
        id: note.id,
        timestamp: new Date(note.timestamp),
        title: note.title || 'Note',
        description: note.content,
        type: 'note',
        emoji: typeEmojis[noteType] || '📝',
        color: typeColors[noteType] || '#60a5fa',
        metadata: {
          noteType: noteType,
        },
      });
    });

    // Convert milestones to timeline events
    console.log('🔄 [Frontend] Converting milestones to timeline events...');
    rawMilestones.forEach((milestone: any) => {
      events.push({
        id: milestone.id,
        timestamp: new Date(milestone.achieved_at || milestone.created_at || new Date()),
        title: milestone.name,
        description: milestone.description,
        type: 'milestone',
        emoji: '🎯',
        color: '#f59e0b',
        metadata: {
          achieved: !!milestone.achieved_at,
        },
      });
    });

    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log(`✅ [Frontend] Created ${events.length} total timeline events`);
    return events;
  } catch (error) {
    console.error('❌ [Frontend] Error fetching timeline events:', error);
    throw error;
  }
}

/**
 * Fetch milestones for a save
 * Optionally filter by player UUID
 */
export async function fetchMilestones(saveId: string, playerUUID?: string): Promise<any[]> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      query milestones($saveId: String!) {
        milestones(saveId: $saveId) {
          id
          name
          description
          target_play_time_ticks
          achieved_at
          position
          created_at
          updated_at
        }
      }
    `;
    console.log('🎯 [Frontend] Fetching milestones via GraphQL for save:', saveId);
    const result = await graphqlQuery(query, { saveId }, token);
    console.log('✅ [Frontend] Milestones response:', result);

    return result.milestones || [];
  } catch (error) {
    console.error('❌ [Frontend] Error fetching milestones:', error);
    throw error;
  }
}

/**
 * Create a new milestone
 * Optionally associate with a specific player
 */
export async function createMilestone(
  saveId: string,
  data: {
    name: string;
    description?: string;
    target_play_time_ticks?: number;
    position?: number;
  },
  playerUUID?: string
): Promise<any> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation createMilestone($saveId: String!, $data: CreateMilestoneInput!) {
        createMilestone(saveId: $saveId, data: $data) {
          id
          name
          description
          target_play_time_ticks
          achieved_at
          position
          created_at
          updated_at
        }
      }
    `;
    console.log('🎯 [Frontend] Creating milestone via GraphQL for save:', saveId);
    console.log('📋 [Frontend] Milestone data:', data);
    const result = await graphqlQuery(query, { saveId, data }, token);
    console.log('✅ [Frontend] Create milestone response:', result);

    return result.createMilestone;
  } catch (error) {
    console.error('❌ [Frontend] Error creating milestone:', error);
    throw error;
  }
}

/**
 * Update an existing milestone
 */
export async function updateMilestone(
  saveId: string,
  milestoneId: string,
  data: {
    name?: string;
    description?: string;
    target_play_time_ticks?: number;
    position?: number;
    achieved_at?: Date | null;
  }
): Promise<any> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation updateMilestone($id: String!, $data: UpdateMilestoneInput!) {
        updateMilestone(id: $id, data: $data) {
          id
          name
          description
          target_play_time_ticks
          achieved_at
          position
          created_at
          updated_at
        }
      }
    `;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name || undefined;
    if (data.description !== undefined) updateData.description = data.description || undefined;
    if (data.target_play_time_ticks !== undefined) updateData.target_play_time_ticks = data.target_play_time_ticks;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.achieved_at !== undefined) updateData.achieved_at = data.achieved_at?.toISOString() || undefined;

    console.log('🎯 [Frontend] Updating milestone via GraphQL');
    console.log('📋 [Frontend] Update data:', updateData);
    const result = await graphqlQuery(query, { id: milestoneId, data: updateData }, token);
    console.log('✅ [Frontend] Update milestone response:', result);

    return result.updateMilestone;
  } catch (error) {
    console.error('❌ [Frontend] Error updating milestone:', error);
    throw error;
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(saveId: string, milestoneId: string): Promise<void> {
  try {
    const token = localStorage.getItem('minecraft_tracker_auth_token');
    const query = `
      mutation deleteMilestone($id: String!) {
        deleteMilestone(id: $id)
      }
    `;
    console.log('🎯 [Frontend] Deleting milestone via GraphQL');
    const result = await graphqlQuery(query, { id: milestoneId }, token);
    console.log('✅ [Frontend] Delete milestone response:', result);
  } catch (error) {
    console.error('❌ [Frontend] Error deleting milestone:', error);
    throw error;
  }
}
