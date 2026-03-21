import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadarController,
  RadialLinearScale,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Radar, Doughnut } from 'react-chartjs-2';
import { ChartData } from '../types/enrichment';
import '../styles/AnalyticsChart.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadarController,
  RadialLinearScale,
  ArcElement
);

interface AnalyticsChartProps {
  type: 'line' | 'bar' | 'radar' | 'doughnut';
  data: ChartData;
  title: string;
  height?: number;
  loading?: boolean;
  empty?: boolean;
}

const chartColors = {
  bg: '#0f172a',
  bgSecondary: '#1e293b',
  text: '#ffffff',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  border: 'rgba(148, 163, 184, 0.2)',
};

const defaultOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: chartColors.textSecondary,
        font: {
          size: 12,
          weight: 'bold',
        },
        padding: 16,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(148, 163, 184, 0.3)',
      borderWidth: 1,
      padding: 12,
      titleColor: chartColors.text,
      bodyColor: chartColors.textSecondary,
      bodyFont: {
        size: 12,
      },
      displayColors: true,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(148, 163, 184, 0.05)',
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

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type,
  data,
  title,
  height = 300,
  loading = false,
  empty = false,
}) => {
  if (empty) {
    return (
      <div className="analytics-chart-container" style={{ height }}>
        <div className="analytics-chart-header">
          <h3 className="analytics-chart-title">{title}</h3>
        </div>
        <div className="analytics-chart-empty">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="analytics-chart-container" style={{ height }}>
        <div className="analytics-chart-header">
          <h3 className="analytics-chart-title">{title}</h3>
        </div>
        <div className="analytics-chart-loading">
          <div className="loading-spinner" />
          <p>Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-chart-container" style={{ height }}>
      <div className="analytics-chart-header">
        <h3 className="analytics-chart-title">{title}</h3>
      </div>
      <div className="analytics-chart-content" style={{ height: height - 50 }}>
        {type === 'line' && <Line data={data} options={defaultOptions} />}
        {type === 'bar' && <Bar data={data} options={defaultOptions} />}
        {type === 'radar' && (
          <Radar
            data={data}
            options={{
              ...defaultOptions,
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
                      weight: 'bold',
                    },
                  },
                },
              },
            }}
          />
        )}
        {type === 'doughnut' && (
          <Doughnut
            data={data}
            options={{
              ...defaultOptions,
              scales: undefined,
            }}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Quick stat card for displaying single metrics
 */
interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  trend,
  icon,
}) => {
  return (
    <div className="stat-card">
      <div className="stat-card-content">
        {icon && <div className="stat-card-icon">{icon}</div>}
        <div className="stat-card-info">
          <div className="stat-label">{label}</div>
          <div className="stat-value">
            {value}
            {unit && <span className="stat-unit">{unit}</span>}
          </div>
        </div>
      </div>
      {trend && (
        <div className={`stat-trend trend-${trend}`}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trend === 'stable' && '→'}
        </div>
      )}
    </div>
  );
};

/**
 * Analytics dashboard grid layout
 */
interface AnalyticsDashboardProps {
  charts: Array<{
    type: 'line' | 'bar' | 'radar' | 'doughnut';
    data: ChartData;
    title: string;
    height?: number;
    loading?: boolean;
  }>;
  stats?: Array<StatCardProps>;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  charts,
  stats,
}) => {
  return (
    <div className="analytics-dashboard">
      {stats && stats.length > 0 && (
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      )}

      <div className="charts-grid">
        {charts.map((chart, index) => (
          <AnalyticsChart
            key={index}
            type={chart.type}
            data={chart.data}
            title={chart.title}
            height={chart.height || 350}
            loading={chart.loading}
            empty={chart.data.labels.length === 0}
          />
        ))}
      </div>
    </div>
  );
};
