import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/LeaderboardTab.css';

interface LeaderboardEntry {
  rank: number;
  username: string;
  user_uuid: string;
  saves_count: number;
  value: number;
  metric: string;
}

interface UserStats {
  username: string;
  saves_count: number;
  total_playtime_hours: number;
  highest_level: number;
  total_mobs_killed: number;
  total_blocks_mined: number;
  total_blocks_placed: number;
  total_deaths: number;
  worlds_visited: number;
}

type MetricType = 'total_playtime_hours' | 'total_mobs_killed' | 'total_blocks_mined' | 'total_blocks_placed' | 'total_deaths';

const METRIC_LABELS: Record<MetricType, string> = {
  total_playtime_hours: '⏱️  Playtime (hours)',
  total_mobs_killed: '⚔️  Mobs Killed',
  total_blocks_mined: '⛏️  Blocks Mined',
  total_blocks_placed: '🧱 Blocks Placed',
  total_deaths: '💀 Deaths',
};

const METRIC_UNITS: Record<MetricType, string> = {
  total_playtime_hours: 'hours',
  total_mobs_killed: 'mobs',
  total_blocks_mined: 'blocks',
  total_blocks_placed: 'blocks',
  total_deaths: 'deaths',
};

export default function LeaderboardTab() {
  const [myStats, setMyStats] = useState<UserStats | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('total_playtime_hours');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's own stats
  useEffect(() => {
    const fetchMyStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('minecraft_tracker_auth_token');
        const response = await axios.post(
          'http://localhost:3000/graphql',
          {
            query: `{
              myStats {
                username
                saves_count
                total_playtime_hours
                highest_level
                total_mobs_killed
                total_blocks_mined
                total_blocks_placed
                total_deaths
                worlds_visited
              }
            }`,
          },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (response.data.errors) {
          console.error('GraphQL error:', response.data.errors);
          setError('Failed to fetch your stats');
          return;
        }

        setMyStats(response.data.data.myStats);
      } catch (err: any) {
        console.error('Error fetching stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyStats();
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('minecraft_tracker_auth_token');
        const response = await axios.post(
          'http://localhost:3000/graphql',
          {
            query: `{
              leaderboard(metric: "${selectedMetric}", limit: 10) {
                rank
                username
                user_uuid
                saves_count
                value
                metric
              }
            }`,
          },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (response.data.errors) {
          console.error('GraphQL error:', response.data.errors);
          setError('Failed to fetch leaderboard');
          return;
        }

        setLeaderboardData(response.data.data.leaderboard || []);
      } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedMetric]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return Math.round(num).toLocaleString();
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>🏆 Local Leaderboards</h2>
        <p>Your stats across all Minecraft saves</p>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      {/* Metric Selector */}
      <div className="metric-selector">
        {(Object.keys(METRIC_LABELS) as MetricType[]).map((metric) => (
          <button
            key={metric}
            className={`metric-btn ${selectedMetric === metric ? 'active' : ''}`}
            onClick={() => setSelectedMetric(metric)}
            disabled={loading}
          >
            {METRIC_LABELS[metric]}
          </button>
        ))}
      </div>

      {/* Your Stats Card */}
      {myStats && (
        <div className="my-stats-card">
          <h3>📊 Your Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Username</span>
              <span className="stat-value">{myStats.username}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Worlds</span>
              <span className="stat-value">{myStats.worlds_visited}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Playtime</span>
              <span className="stat-value">{myStats.total_playtime_hours.toFixed(1)}h</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Highest Level</span>
              <span className="stat-value">{myStats.highest_level}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Mobs Killed</span>
              <span className="stat-value">{formatNumber(myStats.total_mobs_killed)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Blocks Mined</span>
              <span className="stat-value">{formatNumber(myStats.total_blocks_mined)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="leaderboard-section">
        <h3>{METRIC_LABELS[selectedMetric]} Leaderboard</h3>
        {loading ? (
          <div className="loading">Loading leaderboard...</div>
        ) : leaderboardData.length > 0 ? (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="rank-col">Rank</th>
                <th className="name-col">Player</th>
                <th className="saves-col">Worlds</th>
                <th className="value-col">
                  {METRIC_LABELS[selectedMetric]}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((entry, index) => {
                const isCurrentUser = myStats && entry.username === myStats.username;
                return (
                  <tr key={index} className={isCurrentUser ? 'current-user' : ''}>
                    <td className="rank-col">
                      {entry.rank === 1 && '🥇'}
                      {entry.rank === 2 && '🥈'}
                      {entry.rank === 3 && '🥉'}
                      {entry.rank > 3 && `#${entry.rank}`}
                    </td>
                    <td className="name-col">
                      {entry.username}
                      {isCurrentUser && <span className="current-badge">you</span>}
                    </td>
                    <td className="saves-col">{entry.saves_count}</td>
                    <td className="value-col">
                      {formatNumber(entry.value)} {METRIC_UNITS[selectedMetric]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No leaderboard data available</div>
        )}
      </div>
    </div>
  );
}
