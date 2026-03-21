import React, { useState } from 'react';
import apiClient from '../api/client';
import '../styles/SaveDetailsModal.css';

interface Save {
  id: string;
  world_name: string;
  version: string;
  game_mode: string;
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
}

const PREDEFINED_TAGS = ['survival', 'technical', 'creative', 'speedrun', 'modded'];

export default function SaveDetailsModal({ save, onClose }: SaveDetailsModalProps) {
  const [notes, setNotes] = useState(save.notes || '');
  const [status, setStatus] = useState(save.status || 'active');
  const [customTags, setCustomTags] = useState<string[]>(
    typeof save.custom_tags === 'string'
      ? JSON.parse(save.custom_tags)
      : save.custom_tags || []
  );
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      await apiClient.patch(`/saves/${save.id}`, {
        notes,
        status,
        custom_tags: customTags,
      });

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes');
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

        <div className="modal-body">
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
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about this world..."
              rows={4}
            />
          </section>

          {/* Status */}
          <section className="modal-section">
            <h3>Status</h3>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
                onChange={(e) => setNewTag(e.target.value)}
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

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
