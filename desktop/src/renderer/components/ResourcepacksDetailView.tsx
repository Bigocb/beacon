import React, { useState, useEffect } from 'react';
import '../styles/ResourcepacksDetailView.css';

interface Resourcepack {
  id: string;
  name: string;
  filename: string;
  size: number;
  sizeFormatted: string;
  extension: string;
  type: 'zip' | 'directory';
}

interface ResourcepacksDetailViewProps {
  instanceName: string;
  instancePath: string;
  onBack: () => void;
}

const ResourcepacksDetailView: React.FC<ResourcepacksDetailViewProps> = ({
  instanceName,
  instancePath,
  onBack,
}) => {
  const [resourcepacks, setResourcepacks] = useState<Resourcepack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  useEffect(() => {
    loadResourcepacks();
  }, [instancePath]);

  const loadResourcepacks = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.scanner.getInstanceResourcepacks(instancePath);

      if (result.success) {
        setResourcepacks(result.resourcepacks || []);
      } else {
        setError(result.error || 'Failed to load resourcepacks');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading resourcepacks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resourcepacks-detail-view">
      {/* Header */}
      <div className="resourcepacks-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            ← Back
          </button>
          <div className="title-section">
            <h1>{instanceName}</h1>
            <p className="resourcepacks-count">{resourcepacks.length} resourcepack{resourcepacks.length !== 1 ? 's' : ''}</p>
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
          <p>Loading resourcepacks...</p>
        </div>
      ) : resourcepacks.length === 0 ? (
        <div className="empty-state">
          <p>No resourcepacks found in this instance</p>
        </div>
      ) : (
        <>
          {/* Card View */}
          {viewMode === 'cards' && (
            <div className="resourcepacks-grid">
              {resourcepacks.map((rp) => (
                <div key={rp.id} className="resourcepack-card">
                  <div className="resourcepack-card-header">
                    <h3>{rp.name}</h3>
                  </div>

                  <div className="resourcepack-card-details">
                    <div className="resourcepack-type">
                      <span className="type-badge">
                        {rp.type === 'zip' ? '📦 ZIP' : '📁 Directory'}
                      </span>
                    </div>

                    <div className="resourcepack-meta">
                      <div className="meta-item">
                        <span className="meta-label">Size</span>
                        <span className="meta-value">{rp.sizeFormatted}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Type</span>
                        <span className="meta-value">{rp.extension.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="resourcepack-filename">
                      <span className="filename-label">File:</span>
                      <span className="filename-value">{rp.filename}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="resourcepacks-list">
              <div className="list-header">
                <div className="col-name">Name</div>
                <div className="col-type">Type</div>
                <div className="col-size">Size</div>
              </div>

              {resourcepacks.map((rp) => (
                <div key={rp.id} className="list-item">
                  <div className="col-name">{rp.name}</div>
                  <div className="col-type">
                    <span className="type-badge">
                      {rp.type === 'zip' ? '📦' : '📁'}
                    </span>
                  </div>
                  <div className="col-size">{rp.sizeFormatted}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ResourcepacksDetailView;
