import React, { useState } from 'react';
import { WorldMetadataUI } from '../types/enrichment';
import '../styles/WorldMetadataEditor.css';

export interface WorldMetadataEditorProps {
  metadata: WorldMetadataUI;
  onSave: (metadata: WorldMetadataUI) => Promise<void>;
  onCancel: () => void;
  worldName: string;
}

export const WorldMetadataEditor: React.FC<WorldMetadataEditorProps> = ({
  metadata,
  onSave,
  onCancel,
  worldName,
}) => {
  const [description, setDescription] = useState(metadata.description || '');
  const [is_favorite, setIsFavorite] = useState(metadata.is_favorite || false);
  const [theme_color, setThemeColor] = useState(metadata.theme_color || '#64748b');
  const [world_type, setWorldType] = useState(metadata.world_type || 'survival');
  const [modpack_name, setModpackName] = useState(metadata.modpack_name || '');
  const [modpack_version, setModpackVersion] = useState(metadata.modpack_version || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setError(null);
      setIsSaving(true);

      await onSave({
        description,
        is_favorite,
        theme_color,
        world_type,
        modpack_name: world_type === 'modded' ? modpack_name : undefined,
        modpack_version: world_type === 'modded' ? modpack_version : undefined,
        project_id: metadata.project_id,
      });
    } catch (err: any) {
      console.error('Error saving metadata:', err);
      setError(err.message || 'Failed to save metadata');
    } finally {
      setIsSaving(false);
    }
  };

  const worldTypeOptions = [
    { value: 'survival', label: '🌍 Survival' },
    { value: 'creative', label: '🎨 Creative' },
    { value: 'adventure', label: '🗺️ Adventure' },
    { value: 'spectator', label: '👻 Spectator' },
    { value: 'modded', label: '⚙️ Modded' },
  ];

  return (
    <div className="world-metadata-editor">
      <div className="metadata-editor-header">
        <h2>📝 Edit World Metadata</h2>
        <p className="metadata-editor-subtitle">{worldName}</p>
      </div>

      {error && <div className="metadata-error">{error}</div>}

      <form className="metadata-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        {/* Description Field */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="metadata-textarea"
            placeholder="Write notes about this world..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div className="form-helper">Describe your world, goals, or notable features</div>
        </div>

        {/* World Type Field */}
        <div className="form-group">
          <label htmlFor="world_type">World Type</label>
          <select
            id="world_type"
            className="metadata-select"
            value={world_type}
            onChange={(e) => setWorldType(e.target.value as any)}
          >
            {worldTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Modpack Fields (show only if Modded) */}
        {world_type === 'modded' && (
          <>
            <div className="form-group">
              <label htmlFor="modpack_name">Modpack Name</label>
              <input
                id="modpack_name"
                type="text"
                className="metadata-input"
                placeholder="e.g., Better Minecraft"
                value={modpack_name}
                onChange={(e) => setModpackName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="modpack_version">Modpack Version</label>
              <input
                id="modpack_version"
                type="text"
                className="metadata-input"
                placeholder="e.g., 4.2.1"
                value={modpack_version}
                onChange={(e) => setModpackVersion(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Theme Color Field */}
        <div className="form-group">
          <label htmlFor="theme_color">Theme Color</label>
          <div className="color-picker-group">
            <input
              id="theme_color"
              type="color"
              className="color-picker"
              value={theme_color}
              onChange={(e) => setThemeColor(e.target.value)}
            />
            <span className="color-value">{theme_color}</span>
          </div>
        </div>

        {/* Favorite Toggle */}
        <div className="form-group">
          <label htmlFor="is_favorite" className="favorite-label">
            <input
              id="is_favorite"
              type="checkbox"
              className="favorite-checkbox"
              checked={is_favorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
            />
            <span className="favorite-icon">{is_favorite ? '⭐' : '☆'}</span>
            Mark as favorite
          </label>
        </div>

        {/* Action Buttons */}
        <div className="metadata-actions">
          <button
            type="button"
            className="metadata-button metadata-button-cancel"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="metadata-button metadata-button-save"
            disabled={isSaving}
          >
            {isSaving ? '💾 Saving...' : '💾 Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
