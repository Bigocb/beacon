/**
 * Timeline Event Builder
 * Combines notes, milestones, and snapshots into a unified timeline
 */

import { Note, Milestone, AnalyticsSnapshot } from '../types/enrichment';

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

/**
 * Build timeline from all data sources
 */
export function buildTimeline(
  notes: Note[] = [],
  milestones: Milestone[] = [],
  snapshots: AnalyticsSnapshot[] = [],
  worldCreatedDate?: Date
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Add world creation event
  if (worldCreatedDate) {
    events.push({
      id: 'world-created',
      timestamp: worldCreatedDate,
      title: 'World Created',
      description: 'Your world journey begins here',
      type: 'first_play',
      emoji: '🌍',
      color: '#4ade80',
    });
  }

  // Add notes as timeline events
  notes.forEach(note => {
    const typeEmojis: Record<string, string> = {
      general: '📝',
      milestone: '🎯',
      achievement: '⭐',
      issue: '⚠️',
    };

    const typeColors: Record<string, string> = {
      general: '#60a5fa',
      milestone: '#fbbf24',
      achievement: '#4ade80',
      issue: '#ef4444',
    };

    events.push({
      id: `note-${note.id}`,
      timestamp: new Date(note.timestamp),
      title: note.title || `${note.note_type.charAt(0).toUpperCase() + note.note_type.slice(1)}`,
      description: note.content.substring(0, 150) + (note.content.length > 150 ? '...' : ''),
      type: (note.note_type as any) || 'note',
      emoji: typeEmojis[note.note_type] || '📝',
      color: typeColors[note.note_type] || '#60a5fa',
      metadata: {
        noteType: note.note_type,
      },
    });
  });

  // Add milestones as timeline events
  milestones.forEach(milestone => {
    events.push({
      id: `milestone-${milestone.id}`,
      timestamp: milestone.achieved_at ? new Date(milestone.achieved_at) : new Date(),
      title: `${milestone.achieved_at ? '✓' : '→'} ${milestone.name}`,
      description: milestone.description,
      type: 'milestone',
      emoji: milestone.achieved_at ? '🏁' : '🎯',
      color: milestone.achieved_at ? '#4ade80' : '#fbbf24',
      metadata: {
        achieved: !!milestone.achieved_at,
        playtimeHours: milestone.target_play_time_ticks
          ? milestone.target_play_time_ticks / 72000
          : undefined,
      },
    });
  });

  // Add analytics snapshots (major play sessions or milestones)
  snapshots.forEach((snapshot, index) => {
    if (index % 7 === 0 || snapshot.chunk_count || snapshot.entity_count) {
      const playtimeHours = (snapshot.play_time_ticks || 0) / 72000;

      events.push({
        id: `snapshot-${snapshot.id}`,
        timestamp: new Date(snapshot.snapshot_date),
        title: `Snapshot: ${playtimeHours.toFixed(1)}h playtime`,
        description: `Chunks: ${snapshot.chunk_count || 0}, Entities: ${snapshot.entity_count || 0}`,
        type: 'snapshot',
        emoji: '📸',
        color: '#06b6d4',
        metadata: {
          playtimeHours,
          chunkCount: snapshot.chunk_count,
        },
      });
    }
  });

  // Sort by timestamp (descending - most recent first)
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return events;
}

/**
 * Filter timeline events by date range
 */
export function filterTimelineByDateRange(
  events: TimelineEvent[],
  startDate: Date,
  endDate: Date
): TimelineEvent[] {
  return events.filter(
    event =>
      event.timestamp >= startDate && event.timestamp <= endDate
  );
}

/**
 * Filter timeline events by type
 */
export function filterTimelineByType(
  events: TimelineEvent[],
  types: TimelineEvent['type'][]
): TimelineEvent[] {
  if (types.length === 0) return events;
  return events.filter(event => types.includes(event.type));
}

/**
 * Group timeline events by month
 */
export function groupEventsByMonth(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const grouped = new Map<string, TimelineEvent[]>();

  events.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)!.push(event);
  });

  return grouped;
}

/**
 * Group timeline events by week
 */
export function groupEventsByWeek(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const grouped = new Map<string, TimelineEvent[]>();

  events.forEach(event => {
    const date = new Date(event.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)

    const weekKey = weekStart.toISOString().split('T')[0];

    if (!grouped.has(weekKey)) {
      grouped.set(weekKey, []);
    }
    grouped.get(weekKey)!.push(event);
  });

  return grouped;
}

/**
 * Get event statistics
 */
export function getTimelineStats(events: TimelineEvent[]) {
  return {
    totalEvents: events.length,
    byType: {
      notes: events.filter(e => e.type === 'note').length,
      milestones: events.filter(e => e.type === 'milestone').length,
      achievements: events.filter(e => e.type === 'achievement').length,
      snapshots: events.filter(e => e.type === 'snapshot').length,
      issues: events.filter(e => e.type === 'issue').length,
    },
    dateRange: events.length > 0
      ? {
          earliest: new Date(Math.min(...events.map(e => e.timestamp.getTime()))),
          latest: new Date(Math.max(...events.map(e => e.timestamp.getTime()))),
        }
      : null,
  };
}

/**
 * Format timeline event for display
 */
export function formatTimelineEvent(event: TimelineEvent): {
  date: string;
  time: string;
  relativeTime: string;
} {
  const date = new Date(event.timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relativeTime = '';
  if (diffDays === 0) {
    relativeTime = 'Today';
  } else if (diffDays === 1) {
    relativeTime = 'Yesterday';
  } else if (diffDays < 7) {
    relativeTime = `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    relativeTime = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    relativeTime = `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    relativeTime = `${years} year${years > 1 ? 's' : ''} ago`;
  }

  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    relativeTime,
  };
}
