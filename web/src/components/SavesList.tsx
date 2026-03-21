import React from 'react';
import '../styles/SavesList.css';

interface Save {
  id: string;
  world_name: string;
  version: string;
  game_mode: string;
  difficulty?: number;
  last_played?: string;
  status: string;
}

interface SavesListProps {
  saves: Save[];
  onSelectSave: (save: Save) => void;
  loading: boolean;
}

export default function SavesList({ saves, onSelectSave, loading }: SavesListProps) {
  if (loading) {
    return <div className="saves-loading">Loading saves...</div>;
  }

  if (saves.length === 0) {
    return (
      <div className="saves-empty">
        <p>No saves found. Your desktop app will sync saves here automatically.</p>
      </div>
    );
  }

  return (
    <div className="saves-list">
      <table className="saves-table">
        <thead>
          <tr>
            <th>World Name</th>
            <th>Version</th>
            <th>Game Mode</th>
            <th>Difficulty</th>
            <th>Last Played</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {saves.map((save) => (
            <tr
              key={save.id}
              onClick={() => onSelectSave(save)}
              className="save-row"
            >
              <td className="save-name">{save.world_name}</td>
              <td>{save.version}</td>
              <td>{save.game_mode}</td>
              <td>{save.difficulty ?? 'N/A'}</td>
              <td>
                {save.last_played
                  ? new Date(save.last_played).toLocaleDateString()
                  : 'Never'}
              </td>
              <td>
                <span className={`status-badge status-${save.status}`}>
                  {save.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
