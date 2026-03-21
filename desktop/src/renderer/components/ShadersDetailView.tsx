import React, { useState, useEffect } from 'react';
import '../styles/ShadersDetailView.css';

interface Shaderpack {
  id: string;
  name: string;
  filename: string;
  size: number;
  sizeFormatted: string;
  extension: string;
  type: 'zip' | 'directory';
}

interface ShadersDetailViewProps {
  instanceName: string;
  instancePath: string;
  onBack: () => void;
}

const ShadersDetailView: React.FC<ShadersDetailViewProps> = ({
  instanceName,
  instancePath,
  onBack,
}) => {
  const [shaderpacks, setShaderpacks] = useState<Shaderpack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  useEffect(() => {
    loadShaderpacks();
  }, [instancePath]);

  const loadShaderpacks = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.scanner.getInstanceShaderpacks(instancePath);

      if (result.success) {
        setShaderpacks(result.shaderpacks || []);
      } else {
        setError(result.error || 'Failed to load shaderpacks');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading shaderpacks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shaders-detail-view">
      {/* Header */}
      <div className="shaders-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            ← Back
          </button>
          <div className="title-section">
            <h1>{instanceName}</h1>
            <p className="shaderpacks-count">{shaderpacks.length} shaderpack{shaderpacks.length !== 1 ? 's' : ''}</p>
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
          <p>Loading shaderpacks...</p>
        </div>
      ) : shaderpacks.length === 0 ? (
        <div className="empty-state">
          <p>No shaderpacks found in this instance</p>
        </div>
      ) : (
        <>
          {/* Card View */}
          {viewMode === 'cards' && (
            <div className="shaders-grid">
              {shaderpacks.map((sp) => (
                <div key={sp.id} className="shader-card">
                  <div className="shader-card-header">
                    <h3>{sp.name}</h3>
                  </div>

                  <div className="shader-card-details">
                    <div className="shader-type">
                      <span className="type-badge">
                        {sp.type === 'zip' ? '📦 ZIP' : '📁 Directory'}
                      </span>
                    </div>

                    <div className="shader-meta">
                      <div className="meta-item">
                        <span className="meta-label">Size</span>
                        <span className="meta-value">{sp.sizeFormatted}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Type</span>
                        <span className="meta-value">{sp.extension.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="shader-filename">
                      <span className="filename-label">File:</span>
                      <span className="filename-value">{sp.filename}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="shaders-list">
              <div className="list-header">
                <div className="col-name">Name</div>
                <div className="col-type">Type</div>
                <div className="col-size">Size</div>
              </div>

              {shaderpacks.map((sp) => (
                <div key={sp.id} className="list-item">
                  <div className="col-name">{sp.name}</div>
                  <div className="col-type">
                    <span className="type-badge">
                      {sp.type === 'zip' ? '📦' : '📁'}
                    </span>
                  </div>
                  <div className="col-size">{sp.sizeFormatted}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShadersDetailView;
