import React, { useState, useEffect } from 'react';
import '../styles/ModsDetailView.css';

interface Mod {
  id: string;
  name: string;
  filename: string;
  size: number;
  sizeFormatted: string;
  extension: string;
  jarType: 'fabric' | 'forge' | 'unknown';
}

interface ModsDetailViewProps {
  instanceName: string;
  instancePath: string;
  onBack: () => void;
}

const ModsDetailView: React.FC<ModsDetailViewProps> = ({
  instanceName,
  instancePath,
  onBack,
}) => {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  useEffect(() => {
    loadMods();
  }, [instancePath]);

  const loadMods = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.scanner.getInstanceMods(instancePath);

      if (result.success) {
        setMods(result.mods || []);
      } else {
        setError(result.error || 'Failed to load mods');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading mods');
    } finally {
      setLoading(false);
    }
  };

  const getModTypeColor = (jarType: string) => {
    switch (jarType) {
      case 'fabric':
        return '#93c5fd';
      case 'forge':
        return '#fed7aa';
      default:
        return '#cbd5e1';
    }
  };

  const getModTypeLabel = (jarType: string) => {
    switch (jarType) {
      case 'fabric':
        return '🧵 Fabric';
      case 'forge':
        return '🔨 Forge';
      default:
        return '📦 Unknown';
    }
  };

  return (
    <div className="mods-detail-view">
      {/* Header */}
      <div className="mods-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            ← Back
          </button>
          <div className="title-section">
            <h1>{instanceName}</h1>
            <p className="mods-count">{mods.length} mod{mods.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`view-toggle ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Card view"
          >
            🎴
          </button>
          <button
            className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            📋
          </button>
        </div>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      {loading ? (
        <div className="loading-state">
          <p>Loading mods...</p>
        </div>
      ) : mods.length === 0 ? (
        <div className="empty-state">
          <p>No mods found in this instance</p>
        </div>
      ) : (
        <>
          {/* Card View */}
          {viewMode === 'cards' && (
            <div className="mods-grid">
              {mods.map((mod) => (
                <div key={mod.id} className="mod-card">
                  <div className="mod-card-header">
                    <h3>{mod.name}</h3>
                  </div>

                  <div className="mod-card-details">
                    <div className="mod-type">
                      <span
                        className="type-badge"
                        style={{ color: getModTypeColor(mod.jarType) }}
                      >
                        {getModTypeLabel(mod.jarType)}
                      </span>
                    </div>

                    <div className="mod-meta">
                      <div className="meta-item">
                        <span className="meta-label">Size</span>
                        <span className="meta-value">{mod.sizeFormatted}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Type</span>
                        <span className="meta-value">{mod.extension}</span>
                      </div>
                    </div>

                    <div className="mod-filename">
                      <span className="filename-label">File:</span>
                      <span className="filename-value">{mod.filename}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="mods-list">
              <div className="list-header">
                <div className="col-name">Name</div>
                <div className="col-type">Type</div>
                <div className="col-size">Size</div>
              </div>

              {mods.map((mod) => (
                <div key={mod.id} className="list-item">
                  <div className="col-name">{mod.name}</div>
                  <div className="col-type">
                    <span
                      className="type-badge"
                      style={{ color: getModTypeColor(mod.jarType) }}
                    >
                      {getModTypeLabel(mod.jarType)}
                    </span>
                  </div>
                  <div className="col-size">{mod.sizeFormatted}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ModsDetailView;
