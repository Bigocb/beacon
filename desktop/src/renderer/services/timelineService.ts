/**
 * Timeline Service
 * Aggregates timeline events from multiple sources (notes, milestones, analytics)
 */

import axios from 'axios';
import { TimelineEvent, NoteUI, MilestoneUI } from '../types/enrichment';

const API_BASE = 'http://localhost:3000/api';

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
    console.log('📅 [Frontend] Fetching timeline events for save:', saveId, playerUUID ? `(player: ${playerUUID})` : '');

    // Build URLs with optional player filter
    let notesUrl = `${API_BASE}/saves/${saveId}/notes`;
    let milestonesUrl = `${API_BASE}/saves/${saveId}/milestones`;

    if (playerUUID) {
      notesUrl += `?player_uuid=${encodeURIComponent(playerUUID)}`;
      milestonesUrl += `?player_uuid=${encodeURIComponent(playerUUID)}`;
    }

    // Fetch notes and milestones in parallel
    const [notesRes, milestonesRes] = await Promise.all([
      axios.get(notesUrl),
      axios.get(milestonesUrl),
    ]);

    const rawNotes = notesRes.data.notes || [];
    const rawMilestones = milestonesRes.data.milestones || [];

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
    let url = `${API_BASE}/saves/${saveId}/milestones`;
    if (playerUUID) {
      url += `?player_uuid=${encodeURIComponent(playerUUID)}`;
    }
    console.log('🎯 [Frontend] Fetching milestones from:', url);
    const response = await axios.get(url);
    console.log('✅ [Frontend] Milestones response:', response.data);

    return response.data.milestones || [];
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
    const url = `${API_BASE}/saves/${saveId}/milestones`;
    const payload: any = data;
    if (playerUUID) {
      payload.player_uuid = playerUUID;
    }
    console.log('🎯 [Frontend] Creating milestone at:', url);
    console.log('📋 [Frontend] Milestone data:', payload);
    const response = await axios.post(url, payload);
    console.log('✅ [Frontend] Create milestone response:', response.data);

    return response.data.milestone;
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
    const url = `${API_BASE}/saves/${saveId}/milestones/${milestoneId}`;
    console.log('🎯 [Frontend] Updating milestone at:', url);
    console.log('📋 [Frontend] Update data:', data);
    const response = await axios.patch(url, data);
    console.log('✅ [Frontend] Update milestone response:', response.data);

    return response.data.milestone;
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
    const url = `${API_BASE}/saves/${saveId}/milestones/${milestoneId}`;
    console.log('🎯 [Frontend] Deleting milestone at:', url);
    const response = await axios.delete(url);
    console.log('✅ [Frontend] Delete milestone response:', response.data);
  } catch (error) {
    console.error('❌ [Frontend] Error deleting milestone:', error);
    throw error;
  }
}
