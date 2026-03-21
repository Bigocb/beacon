import React from 'react';
import { PlayerData } from '../../scanner/player-parser';
import { getMinecraftItemIcon } from '../../utils/minecraftItemIcons';
import '../styles/PlayerInfoTab.css';

interface PlayerInfoTabProps {
  playerData: PlayerData | null;
  loading: boolean;
}

export default function PlayerInfoTab({ playerData, loading }: PlayerInfoTabProps) {
  if (loading) {
    return (
      <div className="player-info-loading">
        <p>Loading player data...</p>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="player-info-empty">
        <p>No player data available</p>
      </div>
    );
  }

  const healthHearts = Math.ceil(playerData.health / 2);
  const hungerShanksFull = Math.floor(playerData.hunger / 2);
  const hungerShanksHalf = playerData.hunger % 2;

  return (
    <div className="player-info-tab">
      {/* Player Stats */}
      <section className="modal-section">
        <h3>Player Stats</h3>
        <div className="stats-grid">
          {/* Health */}
          <div className="stat-box">
            <div className="stat-label">❤️ Health</div>
            <div className="health-display">
              <div className="health-bar">
                <div
                  className="health-fill"
                  style={{ width: `${(playerData.health / 20) * 100}%` }}
                />
              </div>
              <span className="stat-value">{playerData.health.toFixed(1)}/20</span>
            </div>
          </div>

          {/* Hunger */}
          <div className="stat-box">
            <div className="stat-label">🍖 Hunger</div>
            <div className="hunger-display">
              <div className="hunger-bar">
                <div
                  className="hunger-fill"
                  style={{ width: `${(playerData.hunger / 20) * 100}%` }}
                />
              </div>
              <span className="stat-value">{playerData.hunger.toFixed(1)}/20</span>
            </div>
          </div>

          {/* XP */}
          <div className="stat-box">
            <div className="stat-label">⭐ XP Level</div>
            <div className="xp-display">
              <div className="xp-bar">
                <div
                  className="xp-fill"
                  style={{ width: `${playerData.xpProgress * 100}%` }}
                />
              </div>
              <span className="stat-value">Level {playerData.xpLevel}</span>
            </div>
          </div>

          {/* Saturation */}
          <div className="stat-box">
            <div className="stat-label">✨ Saturation</div>
            <span className="stat-value">{playerData.saturation.toFixed(1)}</span>
          </div>

          {/* Game Mode */}
          <div className="stat-box">
            <div className="stat-label">🎮 Game Mode</div>
            <span className="stat-value">{getGameModeName(playerData.gamemode)}</span>
          </div>
        </div>
      </section>

      {/* Position & Rotation */}
      <section className="modal-section">
        <h3>Position & Rotation</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>X</label>
            <span>{playerData.position.x.toFixed(2)}</span>
          </div>
          <div className="info-item">
            <label>Y</label>
            <span>{playerData.position.y.toFixed(2)}</span>
          </div>
          <div className="info-item">
            <label>Z</label>
            <span>{playerData.position.z.toFixed(2)}</span>
          </div>
          <div className="info-item">
            <label>Yaw</label>
            <span>{playerData.rotation.yaw.toFixed(2)}°</span>
          </div>
          <div className="info-item">
            <label>Pitch</label>
            <span>{playerData.rotation.pitch.toFixed(2)}°</span>
          </div>
          {playerData.dimension && (
            <div className="info-item">
              <label>Dimension</label>
              <span>{playerData.dimension}</span>
            </div>
          )}
        </div>
      </section>

      {/* Armor */}
      {playerData.armor.length > 0 && (
        <section className="modal-section">
          <h3>Armor</h3>
          <div className="armor-slots">
            {playerData.armor.map((item, index) => (
              <div key={`${item.slot}-${index}`} className="armor-slot">
                <div className="armor-label">{getArmorSlotEmoji(item.slot)}</div>
                <div className="armor-item">
                  <span className="item-name">{formatItemName(item.id)}</span>
                  {item.count > 1 && <span className="item-count">{item.count}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Inventory */}
      {playerData.inventory.length > 0 && (
        <section className="modal-section">
          <h3>Inventory ({playerData.inventory.length} items)</h3>
          <div className="inventory-grid">
            {playerData.inventory.map((item, index) => (
              <div key={`${item.slot}-${index}`} className="inventory-item" title={`${item.id} (${item.count})`}>
                <span className="item-icon">{getMinecraftItemIcon(item.id)}</span>
                <span className="item-count">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="inventory-info">
            Showing {playerData.inventory.length} items in inventory
          </div>
        </section>
      )}

      {/* Active Effects */}
      {playerData.effects.length > 0 && (
        <section className="modal-section">
          <h3>Active Effects</h3>
          <div className="effects-list">
            {playerData.effects.map((effect, index) => (
              <div key={`${effect.id}-${index}`} className="effect-badge">
                <span className="effect-name">{effect.name}</span>
                <span className="effect-level">{effect.amplifier + 1}</span>
                <span className="effect-duration">{formatDuration(effect.duration)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {playerData.effects.length === 0 && (
        <section className="modal-section">
          <h3>Active Effects</h3>
          <p className="empty-text">No active effects</p>
        </section>
      )}
    </div>
  );
}

function getGameModeName(mode: number): string {
  switch (mode) {
    case 0:
      return 'Survival';
    case 1:
      return 'Creative';
    case 2:
      return 'Adventure';
    case 3:
      return 'Spectator';
    default:
      return 'Unknown';
  }
}

function getArmorSlotEmoji(slot: string): string {
  switch (slot) {
    case 'head':
      return '🪖';
    case 'chest':
      return '🛡️';
    case 'legs':
      return '👖';
    case 'feet':
      return '👢';
    default:
      return '❓';
  }
}

function formatItemName(itemId: string): string {
  // Convert minecraft:diamond_pickaxe to Diamond Pickaxe
  const name = itemId.replace('minecraft:', '').replace(/_/g, ' ');
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDuration(ticks: number): string {
  // Convert ticks to seconds (20 ticks = 1 second)
  const seconds = Math.floor(ticks / 20);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
