/**
 * Analytics Data Calculator
 * Generates chart data from analytics snapshots and play data
 */

import { AnalyticsSnapshot, ChartData } from '../types/enrichment';
import {
  chartColors,
  getDatasetColor,
  ticksToHours,
  formatHours,
} from './chartConfig';

/**
 * Generate playtime trend chart data
 * Shows hours played per day over time
 */
export function generatePlaytimeTrendData(
  snapshots: AnalyticsSnapshot[]
): ChartData {
  if (snapshots.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  // Sort by date
  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  const labels = sorted.map(s => {
    const date = new Date(s.snapshot_date);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  });

  // Calculate daily playtime (difference between consecutive snapshots)
  const playtimes = sorted.map((snapshot, index) => {
    if (index === 0) return 0;
    const prev = sorted[index - 1];
    const diffTicks = (snapshot.play_time_ticks || 0) - (prev.play_time_ticks || 0);
    return Math.max(0, ticksToHours(diffTicks)); // Prevent negative values
  });

  return {
    labels,
    datasets: [
      {
        label: 'Playtime (hours)',
        data: playtimes,
        borderColor: chartColors.primary,
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: chartColors.primary,
        pointBorderColor: chartColors.bg,
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
    ],
  };
}

/**
 * Generate cumulative playtime chart
 * Shows total playtime growing over time
 */
export function generateCumulativePlaytimeData(
  snapshots: AnalyticsSnapshot[]
): ChartData {
  if (snapshots.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  const labels = sorted.map(s => {
    const date = new Date(s.snapshot_date);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  });

  const cumulativeHours = sorted.map(s => ticksToHours(s.play_time_ticks || 0));

  return {
    labels,
    datasets: [
      {
        label: 'Total Playtime (hours)',
        data: cumulativeHours,
        borderColor: chartColors.success,
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: chartColors.success,
        pointBorderColor: chartColors.bg,
        pointBorderWidth: 2,
      },
    ],
  };
}

/**
 * Generate activity heatmap data
 * Shows which days of week player is most active
 */
export function generateActivityHeatmapData(
  snapshots: AnalyticsSnapshot[]
): { labels: string[]; data: number[] } {
  const dayActivity = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
  };

  const dayNames = Object.keys(dayActivity);

  snapshots.forEach(snapshot => {
    const date = new Date(snapshot.snapshot_date);
    const dayOfWeek = dayNames[date.getDay()];
    const playtimeHours = ticksToHours(snapshot.play_time_ticks || 0);
    dayActivity[dayOfWeek as keyof typeof dayActivity] += playtimeHours;
  });

  return {
    labels: dayNames,
    data: Object.values(dayActivity),
  };
}

/**
 * Generate world comparison data
 * Compare stats across multiple worlds
 */
export function generateWorldComparisonData(
  worldStats: Array<{
    name: string;
    playtimeHours: number;
    chunkCount?: number;
  }>
): ChartData {
  return {
    labels: worldStats.map(w => w.name),
    datasets: [
      {
        label: 'Playtime (hours)',
        data: worldStats.map(w => w.playtimeHours),
        backgroundColor: [
          'rgba(96, 165, 250, 0.6)',
          'rgba(74, 222, 128, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(6, 182, 212, 0.6)',
          'rgba(167, 139, 250, 0.6)',
        ],
        borderColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.info,
          chartColors.secondary,
        ],
        borderWidth: 2,
      },
    ],
  };
}

/**
 * Generate chunk/entity distribution
 * Shows exploration and mob activity
 */
export function generateWorldStatsData(
  snapshot: AnalyticsSnapshot
): ChartData {
  const stats = [];
  const colors = [];

  if (snapshot.chunk_count !== undefined && snapshot.chunk_count > 0) {
    stats.push(snapshot.chunk_count);
    colors.push(chartColors.primary);
  }

  if (snapshot.entity_count !== undefined && snapshot.entity_count > 0) {
    stats.push(snapshot.entity_count);
    colors.push(chartColors.success);
  }

  if (snapshot.tile_entity_count !== undefined && snapshot.tile_entity_count > 0) {
    stats.push(snapshot.tile_entity_count);
    colors.push(chartColors.warning);
  }

  return {
    labels: ['Chunks Loaded', 'Entities', 'Tile Entities'],
    datasets: [
      {
        data: stats,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 2,
      },
    ],
  };
}

/**
 * Calculate playtime trend direction
 * Returns 'increasing', 'decreasing', or 'stable'
 */
export function calculatePlaytimeTrend(
  snapshots: AnalyticsSnapshot[]
): 'increasing' | 'decreasing' | 'stable' {
  if (snapshots.length < 3) return 'stable';

  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  // Get recent vs past
  const recent = sorted.slice(-7); // Last 7 days
  const past = sorted.slice(-14, -7); // 7 days before that

  const recentAvg = recent.reduce((sum, s) => sum + (s.play_time_ticks || 0), 0) / recent.length;
  const pastAvg = past.reduce((sum, s) => sum + (s.play_time_ticks || 0), 0) / past.length;

  const percentChange = ((recentAvg - pastAvg) / pastAvg) * 100;

  if (percentChange > 10) return 'increasing';
  if (percentChange < -10) return 'decreasing';
  return 'stable';
}

/**
 * Calculate world statistics summary
 */
export function calculateWorldStats(snapshots: AnalyticsSnapshot[]) {
  if (snapshots.length === 0) {
    return {
      totalPlaytimeHours: 0,
      averageChunks: 0,
      averageEntities: 0,
      peakChunks: 0,
      peakEntities: 0,
    };
  }

  const latest = snapshots[snapshots.length - 1];

  return {
    totalPlaytimeHours: ticksToHours(latest.play_time_ticks || 0),
    averageChunks:
      snapshots.reduce((sum, s) => sum + (s.chunk_count || 0), 0) / snapshots.length,
    averageEntities:
      snapshots.reduce((sum, s) => sum + (s.entity_count || 0), 0) / snapshots.length,
    peakChunks: Math.max(...snapshots.map(s => s.chunk_count || 0)),
    peakEntities: Math.max(...snapshots.map(s => s.entity_count || 0)),
  };
}

/**
 * Generate session distribution chart
 * Shows frequency of different session lengths
 */
export function generateSessionDistribution(
  snapshots: AnalyticsSnapshot[]
): ChartData {
  if (snapshots.length < 2) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  // Calculate session lengths (playtime between snapshots)
  const sessions: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffTicks = (sorted[i].play_time_ticks || 0) - (sorted[i - 1].play_time_ticks || 0);
    if (diffTicks > 0) {
      sessions.push(ticksToHours(diffTicks));
    }
  }

  if (sessions.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  // Bin sessions by duration
  const bins = {
    '< 30m': sessions.filter(s => s < 0.5).length,
    '30m - 1h': sessions.filter(s => s >= 0.5 && s < 1).length,
    '1h - 2h': sessions.filter(s => s >= 1 && s < 2).length,
    '2h - 4h': sessions.filter(s => s >= 2 && s < 4).length,
    '4h+': sessions.filter(s => s >= 4).length,
  };

  return {
    labels: Object.keys(bins),
    datasets: [
      {
        label: 'Session Count',
        data: Object.values(bins),
        backgroundColor: chartColors.primary + 'B3',
        borderColor: chartColors.primary,
        borderWidth: 2,
      },
    ],
  };
}
