import React, { useState } from 'react';
import '../styles/AllSavesPage.css';

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
  folder_id?: string;
  play_time_ticks?: number;
}

interface AllSavesPageProps {
  saves: Save[];
  onBack: () => void;
  onSelectSave?: (save: Save) => void;
}

type SortField = 'name' | 'lastplayed' | 'playtime' | 'version' | 'gamemode';
type SortDirection = 'asc' | 'desc';

export default function AllSavesPage({ saves, onBack, onSelectSave }: AllSavesPageProps) {
  const [sortField, setSortField] = useState<SortField>('lastplayed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort saves based on current sort field and direction
  const sortedSaves = [...saves].sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';

    switch (sortField) {
      case 'name':
        aVal = a.world_name || '';
        bVal = b.world_name || '';
        break;
      case 'lastplayed':
        aVal = new Date(a.last_played || 0).getTime();
        bVal = new Date(b.last_played || 0).getTime();
        break;
      case 'playtime':
        aVal = a.play_time_ticks || 0;
        bVal = b.play_time_ticks || 0;
        break;
      case 'version':
        aVal = a.version || '';
        bVal = b.version || '';
        break;
      case 'gamemode':
        aVal = a.game_mode || '';
        bVal = b.game_mode || '';
        break;
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const formatPlaytime = (ticks: number | undefined) => {
    if (!ticks) return '0h';
    const hours = Math.floor(ticks / 72000);
    const minutes = Math.floor((ticks % 72000) / 1200);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatLastPlayed = (dateStr: string | undefined) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  return (
    <div className="all-saves-page">
      <div className="saves-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h1>📚 All Saves ({saves.length})</h1>
      </div>

      {saves.length === 0 ? (
        <div className="empty-state">
          <p>No saves found</p>
        </div>
      ) : (
        <div className="saves-table-container">
          <table className="saves-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSortClick('name')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  World Name{getSortIndicator('name')}
                </th>
                <th
                  onClick={() => handleSortClick('version')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Version{getSortIndicator('version')}
                </th>
                <th
                  onClick={() => handleSortClick('gamemode')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Game Mode{getSortIndicator('gamemode')}
                </th>
                <th
                  onClick={() => handleSortClick('playtime')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Playtime{getSortIndicator('playtime')}
                </th>
                <th
                  onClick={() => handleSortClick('lastplayed')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Last Played{getSortIndicator('lastplayed')}
                </th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedSaves.map((save) => (
                <tr
                  key={save.id}
                  onClick={() => onSelectSave?.(save)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view save details"
                >
                  <td className="save-name">{save.world_name || 'Unknown'}</td>
                  <td className="save-version">{save.version || 'N/A'}</td>
                  <td className="save-gamemode">
                    <span className={`gamemode-badge gamemode-${(save.game_mode || 'unknown').toLowerCase()}`}>
                      {save.game_mode || 'Unknown'}
                    </span>
                  </td>
                  <td className="save-playtime">{formatPlaytime(save.play_time_ticks)}</td>
                  <td className="save-lastplayed">{formatLastPlayed(save.last_played)}</td>
                  <td className="save-status">
                    <span className={`status-badge status-${(save.status || 'active').toLowerCase()}`}>
                      {save.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
