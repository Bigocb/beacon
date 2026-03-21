import React, { useState, useEffect } from 'react';
import { getPlayerList, extractPlayerData } from '../../utils/saveDataExtractor';
import { PlayerData } from '../../scanner/player-parser';
import PlayerInfoTab from './PlayerInfoTab';
import '../styles/SaveDetailsModal.css';

interface Save {
  id: string;
  world_name: string;
  version: string;
  game_mode: string;
  path?: string;
  difficulty?: number;
  seed?: number;
  spawn_x?: number;
  spawn_y?: number;
  spawn_z?: number;
  notes?: string;
  status?: string;
  custom_tags?: string[];
}

interface SaveDetailsModalProps {
  save: Save;
  onClose: () => void;
  onSave: (updates: Partial<Save>) => void;
}

interface PlayerInfo {
  uuid: string;
  name: string;
  skinUrl?: string;
}

const PREDEFINED_TAGS = ['survival', 'technical', 'creative', 'speedrun', 'modded'];

export default function SaveDetailsModal({ save, onClose, onSave }: SaveDetailsModalProps) {
  // World info state
  const [notes, setNotes] = useState(save.notes || '');
  const [status, setStatus] = useState(save.status || 'active');
  const [customTags, setCustomTags] = useState<string[]>(
    typeof save.custom_tags === 'string'
      ? JSON.parse(save.custom_tags)
      : save.custom_tags || []
  );
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  // Player info state
  const [activeTab, setActiveTab] = useState<'world' | 'player'>('world');
  const [availablePlayers, setAvailablePlayers] = useState<PlayerInfo[]>([]);
  const [selectedPlayerUUID, setSelectedPlayerUUID] = useState<string>('');
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingPlayerData, setLoadingPlayerData] = useState(false);
  const [playerNameCache, setPlayerNameCache] = useState<Record<string, PlayerInfo>>({});

  // Load player list on mount
  useEffect(() => {
    loadPlayers();
  }, [save.path]);

  // Load player data when UUID changes
  useEffect(() => {
    if (selectedPlayerUUID && activeTab === 'player') {
      loadPlayerData(selectedPlayerUUID);
    }
  }, [selectedPlayerUUID, activeTab]);

  const loadPlayers = async () => {
    if (!save.path) return;

    setLoadingPlayers(true);
    try {
      const uuids = await getPlayerList(save.path);

      if (uuids.length === 0) {
        setAvailablePlayers([]);
        return;
      }

      // Fetch player names from Mojang API
      const players: PlayerInfo[] = [];

      for (const uuid of uuids) {
        // Check cache first
        if (playerNameCache[uuid]) {
          players.push(playerNameCache[uuid]);
          continue;
        }

        try {
          const response = await fetch(
            `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
          );
          if (response.ok) {
            const data = await response.json();
            const playerInfo: PlayerInfo = {
              uuid,
              name: data.name,
              skinUrl: extractSkinUrl(data.properties),
            };
            players.push(playerInfo);
            setPlayerNameCache((prev) => ({
              ...prev,
              [uuid]: playerInfo,
            }));
          } else {
            // Fallback to UUID if API fails
            const playerInfo: PlayerInfo = { uuid, name: uuid.substring(0, 8) };
            players.push(playerInfo);
          }
        } catch (error) {
          console.warn(`Failed to fetch player name for ${uuid}:`, error);
          // Fallback to UUID
          const playerInfo: PlayerInfo = { uuid, name: uuid.substring(0, 8) };
          players.push(playerInfo);
        }
      }

      setAvailablePlayers(players);
      // Auto-select first player
      if (players.length > 0) {
        setSelectedPlayerUUID(players[0].uuid);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const loadPlayerData = async (uuid: string) => {
    if (!save.path) return;

    setLoadingPlayerData(true);
    try {
      const data = await extractPlayerData(save.path, uuid);
      setPlayerData(data);
    } catch (error) {
      console.error('Error loading player data:', error);
      setPlayerData(null);
    } finally {
      setLoadingPlayerData(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setCustomTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (newTag && !customTags.includes(newTag)) {
      setCustomTags([...customTags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setCustomTags(customTags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave({
        notes,
        status,
        custom_tags: customTags,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{save.world_name}</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'world' ? 'active' : ''}`}
            onClick={() => setActiveTab('world')}
          >
            World Info
          </button>
          {availablePlayers.length > 0 && (
            <button
              className={`modal-tab ${activeTab === 'player' ? 'active' : ''}`}
              onClick={() => setActiveTab('player')}
            >
              Player
            </button>
          )}
        </div>

        <div className="modal-body">
          {activeTab === 'world' ? (
            <>
              {/* Basic Info */}
              <section className="modal-section">
                <h3>Basic Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Version</label>
                    <span>{save.version}</span>
                  </div>
                  <div className="info-item">
                    <label>Game Mode</label>
                    <span>{save.game_mode}</span>
                  </div>
                  <div className="info-item">
                    <label>Difficulty</label>
                    <span>{save.difficulty ?? 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Seed</label>
                    <span>{save.seed ?? 'N/A'}</span>
                  </div>
                </div>
                {save.spawn_x !== undefined && (
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Spawn X</label>
                      <span>{save.spawn_x}</span>
                    </div>
                    <div className="info-item">
                      <label>Spawn Y</label>
                      <span>{save.spawn_y}</span>
                    </div>
                    <div className="info-item">
                      <label>Spawn Z</label>
                      <span>{save.spawn_z}</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Notes */}
              <section className="modal-section">
                <h3>Notes</h3>
                <textarea
                  className="notes-input"
                  value={notes}
                  onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
                  placeholder="Add your notes about this world..."
                  rows={4}
                />
              </section>

              {/* Status */}
              <section className="modal-section">
                <h3>Status</h3>
                <select
                  value={status}
                  onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}
                >
                  <option value="active">Active</option>
                  <option value="abandoned">Abandoned</option>
                  <option value="completed">Completed</option>
                </select>
              </section>

              {/* Tags */}
              <section className="modal-section">
                <h3>Tags</h3>
                <div className="tags-container">
                  {PREDEFINED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      className={`tag-button ${customTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="custom-tag-input">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag((e.target as HTMLInputElement).value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                    placeholder="Add custom tag..."
                  />
                  <button onClick={handleAddCustomTag}>Add</button>
                </div>

                {customTags.length > 0 && (
                  <div className="selected-tags">
                    {customTags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              {/* Player Selector */}
              {availablePlayers.length > 0 && (
                <section className="modal-section">
                  <h3>Select Player</h3>
                  <select
                    value={selectedPlayerUUID}
                    onChange={(e) => setSelectedPlayerUUID(e.target.value)}
                    className="player-select"
                  >
                    {availablePlayers.map((player) => (
                      <option key={player.uuid} value={player.uuid}>
                        {player.name} ({player.uuid.substring(0, 8)})
                      </option>
                    ))}
                  </select>
                </section>
              )}

              {/* Player Info Tab */}
              <PlayerInfoTab playerData={playerData} loading={loadingPlayerData} />
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          {activeTab === 'world' && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function extractSkinUrl(properties: any[]): string | undefined {
  if (!properties) return undefined;
  const texturesProperty = properties.find((p) => p.name === 'textures');
  if (!texturesProperty) return undefined;
  try {
    const decodedValue = Buffer.from(texturesProperty.value, 'base64').toString();
    const texturesObj = JSON.parse(decodedValue);
    return texturesObj.textures?.SKIN?.url;
  } catch {
    return undefined;
  }
}
