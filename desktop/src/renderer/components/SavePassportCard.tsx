import React from 'react';
import '../styles/SavePassportCard.css';

interface Save {
  id: string;
  world_name: string;
  version: string;
  game_mode: string;
  difficulty?: number;
  seed?: number;
  last_played?: string;
  status: string;
  folder_name?: string;
  folder_path?: string;
  playtime?: number; // in seconds
  explored?: number; // percentage
  advancements_completed?: number;
  advancements_total?: number;
  mobs_killed?: number;
  deaths?: number;
  blocks_mined?: number;
  spawn_x?: number;
  spawn_y?: number;
  spawn_z?: number;
  created_at?: string;
  player_count?: number;
  players?: Array<{ uuid: string; name?: string }>;
}

interface InstanceMetadata {
  display_name?: string;
  mod_loader?: string;
  loader_version?: string;
}

interface SavePassportCardProps {
  save: Save;
  instance?: InstanceMetadata;
  onClick?: () => void;
  onDelete?: () => void;
}

const GAME_MODE_COLORS: Record<string, string> = {
  survival: '#16a34a',
  creative: '#3b82f6',
  adventure: '#f59e0b',
  spectator: '#8b5cf6',
  hardcore: '#dc2626',
};

const formatPlaytime = (seconds: number | undefined): string => {
  if (!seconds) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
};

const getDifficultyLabel = (difficulty: number | undefined): string => {
  const labels = ['Peaceful', 'Easy', 'Normal', 'Hard'];
  return difficulty !== undefined ? labels[difficulty] || 'Unknown' : 'Unknown';
};

export const SavePassportCard: React.FC<SavePassportCardProps> = ({
  save,
  instance,
  onClick,
  onDelete,
}) => {
  const gameModeColor = GAME_MODE_COLORS[save.game_mode.toLowerCase()] || '#64748b';
  const advancementsPercent =
    save.advancements_total && save.advancements_completed
      ? Math.round((save.advancements_completed / save.advancements_total) * 100)
      : 0;
  const exploredPercent = save.explored || 0;

  return (
    <div className="save-passport-card" onClick={onClick}>
      {/* Header */}
      <div className="save-passport-header">
        <div className="save-passport-title-section">
          <h3 className="save-passport-name">{save.world_name}</h3>
          <div className="save-passport-badges">
            <span
              className="save-passport-gamemode-badge"
              style={{ backgroundColor: gameModeColor }}
            >
              {save.game_mode.charAt(0).toUpperCase() + save.game_mode.slice(1)}
            </span>
            <span className="save-passport-difficulty-badge">
              {getDifficultyLabel(save.difficulty)}
            </span>
            {save.player_count && save.player_count > 0 && (
              <span className="save-passport-player-badge" title="Number of players">
                👥 {save.player_count}
              </span>
            )}
          </div>
        </div>
        <button
          className="save-passport-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          title="Delete"
        >
          ×
        </button>
      </div>

      {/* Stats Row */}
      <div className="save-passport-stats-row">
        <div className="save-passport-stat">
          <span className="save-passport-stat-label">Playtime</span>
          <span className="save-passport-stat-value">{formatPlaytime(save.playtime)}</span>
        </div>
        <div className="save-passport-stat">
          <span className="save-passport-stat-label">Last Played</span>
          <span className="save-passport-stat-value">{formatDate(save.last_played)}</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="save-passport-progress">
        {save.advancements_total && (
          <div className="save-passport-progress-item">
            <div className="save-passport-progress-label">
              <span>Advancements</span>
              <span>{advancementsPercent}%</span>
            </div>
            <div className="save-passport-progress-bar">
              <div
                className="save-passport-progress-fill"
                style={{ width: `${advancementsPercent}%` }}
              />
            </div>
          </div>
        )}

        {exploredPercent > 0 && (
          <div className="save-passport-progress-item">
            <div className="save-passport-progress-label">
              <span>Explored</span>
              <span>{exploredPercent}%</span>
            </div>
            <div className="save-passport-progress-bar">
              <div
                className="save-passport-progress-fill"
                style={{ width: `${exploredPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="save-passport-quick-stats">
        {save.mobs_killed != null && (
          <div className="save-passport-quick-stat">
            <span className="save-passport-quick-stat-icon">⚔</span>
            <span className="save-passport-quick-stat-text">
              {save.mobs_killed.toLocaleString()} mobs
            </span>
          </div>
        )}
        {save.deaths != null && (
          <div className="save-passport-quick-stat">
            <span className="save-passport-quick-stat-icon">💀</span>
            <span className="save-passport-quick-stat-text">{save.deaths} deaths</span>
          </div>
        )}
        {save.blocks_mined !== undefined && (
          <div className="save-passport-quick-stat">
            <span className="save-passport-quick-stat-icon">⛏</span>
            <span className="save-passport-quick-stat-text">
              {(save.blocks_mined / 1000).toFixed(1)}k blocks
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="save-passport-footer">
        <span className="save-passport-created">
          Created: {formatDate(save.created_at)}
        </span>
        {save.spawn_x !== undefined && (
          <span className="save-passport-spawn">
            Spawn: {save.spawn_x}, {save.spawn_y}, {save.spawn_z}
          </span>
        )}
      </div>
    </div>
  );
};
