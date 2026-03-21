/**
 * Chart Configuration & Styling
 * Centralized chart styling and color scheme for Beacon app
 */

// Color palette matching Beacon's dark theme
export const chartColors = {
  primary: '#60a5fa',
  primaryLight: '#93c5fd',
  success: '#4ade80',
  danger: '#ef4444',
  warning: '#fbbf24',
  info: '#06b6d4',
  secondary: '#a78bfa',
  muted: '#94a3b8',
  bg: '#0f172a',
  bgSecondary: '#1e293b',
  bgTertiary: '#334155',
  text: '#ffffff',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
};

export const gradients = {
  // Gradient colors for areas
  primaryGradient: {
    light: 'rgba(96, 165, 250, 0.1)',
    medium: 'rgba(96, 165, 250, 0.3)',
    dark: 'rgba(96, 165, 250, 0.6)',
  },
  successGradient: {
    light: 'rgba(74, 222, 128, 0.1)',
    medium: 'rgba(74, 222, 128, 0.3)',
    dark: 'rgba(74, 222, 128, 0.6)',
  },
};

// Chart.js default options
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: true,
      labels: {
        color: chartColors.textSecondary,
        font: {
          size: 12,
          weight: '500',
          family: '"Monaco", "Courier New", monospace',
        },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(148, 163, 184, 0.2)',
      borderWidth: 1,
      padding: 12,
      titleColor: chartColors.text,
      bodyColor: chartColors.textSecondary,
      bodyFont: {
        size: 12,
      },
      displayColors: true,
      usePointStyle: true,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)',
        drawBorder: false,
      },
      ticks: {
        color: chartColors.textMuted,
        font: {
          size: 11,
        },
      },
    },
    y: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)',
        drawBorder: false,
      },
      ticks: {
        color: chartColors.textMuted,
        font: {
          size: 11,
        },
      },
    },
  },
};

// Line chart preset
export const lineChartOptions = {
  ...defaultChartOptions,
  scales: {
    ...defaultChartOptions.scales,
    y: {
      ...defaultChartOptions.scales.y,
      beginAtZero: true,
    },
  },
};

// Bar chart preset
export const barChartOptions = {
  ...defaultChartOptions,
  scales: {
    ...defaultChartOptions.scales,
    y: {
      ...defaultChartOptions.scales.y,
      beginAtZero: true,
    },
  },
};

// Radar chart preset (for skill/stats comparison)
export const radarChartOptions = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      ...defaultChartOptions.plugins.legend,
      position: 'top',
    },
  },
  scales: {
    r: {
      beginAtZero: true,
      grid: {
        color: 'rgba(148, 163, 184, 0.15)',
      },
      ticks: {
        color: chartColors.textMuted,
        font: {
          size: 10,
        },
        backdropColor: 'transparent',
      },
      pointLabels: {
        color: chartColors.textSecondary,
        font: {
          size: 11,
          weight: '500',
        },
      },
    },
  },
};

// Doughnut/Pie chart preset
export const doughnutChartOptions = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      ...defaultChartOptions.plugins.legend,
      position: 'right',
    },
  },
};

/**
 * Get dataset styling for a given index
 * Cycles through color palette
 */
export function getDatasetColor(index: number): string {
  const colors = [
    chartColors.primary,
    chartColors.success,
    chartColors.warning,
    chartColors.info,
    chartColors.secondary,
    chartColors.danger,
  ];
  return colors[index % colors.length];
}

/**
 * Format large numbers for display
 * 1000 -> "1.0k", 1000000 -> "1.0M"
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k';
  }
  return value.toString();
}

/**
 * Format hours into human-readable format
 * 1.5 -> "1h 30m", 0.25 -> "15m"
 */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

/**
 * Format seconds as playtime
 * 3661 -> "1h 1m 1s"
 */
export function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Convert Minecraft ticks to hours
 * 1 tick = 0.05 seconds
 * 72000 ticks = 1 hour
 */
export function ticksToHours(ticks: number): number {
  return ticks / 72000;
}

/**
 * Convert Minecraft ticks to human readable format
 */
export function formatTicks(ticks: number): string {
  return formatHours(ticksToHours(ticks));
}
