import React, { useState, useEffect, useRef } from 'react';
import '../styles/ScreenshotsDetailView.css';

interface Screenshot {
  id: string;
  name: string;
  filename: string;
  filePath: string;
  size: number;
  sizeFormatted: string;
  extension: string;
  taken: number;
  takenFormatted: string;
  dataUri?: string;
}

interface ScreenshotsDetailViewProps {
  instanceName: string;
  instancePath: string;
  onBack: () => void;
}

const ScreenshotsDetailView: React.FC<ScreenshotsDetailViewProps> = ({
  instanceName,
  instancePath,
  onBack,
}) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedScreenshot, setExpandedScreenshot] = useState<Screenshot | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadScreenshots();
  }, [instancePath]);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const screenshotId = entry.target.getAttribute('data-screenshot-id');
            if (screenshotId && !loadingRef.current.has(screenshotId)) {
              loadingRef.current.add(screenshotId);
              const screenshot = screenshots.find((s) => s.id === screenshotId);
              if (screenshot && !screenshot.dataUri) {
                loadScreenshotDataUri(screenshot);
              }
            }
          }
        });
      },
      { rootMargin: '100px' } // Start loading 100px before entering view
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [screenshots]);

  const loadScreenshots = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.scanner.getInstanceScreenshots(instancePath);

      if (result.success) {
        const screenshotList = result.screenshots || [];
        console.log(`📸 Loaded ${screenshotList.length} screenshots (lazy loading enabled)`);
        setScreenshots(screenshotList);
      } else {
        setError(result.error || 'Failed to load screenshots');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading screenshots');
    } finally {
      setLoading(false);
    }
  };

  const loadScreenshotDataUri = async (screenshot: Screenshot) => {
    try {
      console.log(`📷 Lazy loading image data URI for: ${screenshot.filePath}`);
      const dataUriResult = await window.api.utils.loadImageAsDataUri(screenshot.filePath);

      if (dataUriResult.success) {
        console.log(`✅ Successfully loaded data URI for ${screenshot.filename}`);
        setScreenshots((prevScreenshots) =>
          prevScreenshots.map((s) =>
            s.id === screenshot.id ? { ...s, dataUri: dataUriResult.dataUri } : s
          )
        );
      } else {
        console.warn(`⚠️ Data URI loading failed for ${screenshot.filename}:`, dataUriResult.error);
      }
    } catch (err) {
      console.error(`❌ Failed to load image data URI for ${screenshot.filename}:`, err);
    }
  };

  const handleThumbnailClick = (screenshot: Screenshot) => {
    // If data URI is already loaded, just show it
    if (screenshot.dataUri) {
      setExpandedScreenshot(screenshot);
      return;
    }

    // Otherwise load it for the expanded view
    console.log(`📷 Loading expanded image on demand for: ${screenshot.filePath}`);
    loadScreenshotDataUri(screenshot);

    // Show the modal immediately with fallback to file:// URL
    setExpandedScreenshot(screenshot);
  };

  const handleCloseModal = () => {
    setExpandedScreenshot(null);
  };

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  // Helper to convert Windows paths to proper file:// URLs
  const getImageUrl = (filePath: string, dataUri?: string): string => {
    if (dataUri) return dataUri;
    // Convert Windows backslashes to forward slashes and add file:// protocol
    const normalizedPath = filePath.replace(/\\/g, '/');
    // Add file:// prefix if not already present
    if (normalizedPath.startsWith('file://')) {
      return normalizedPath;
    }
    // Handle both absolute Windows paths (C:/) and UNC paths
    if (normalizedPath.match(/^[A-Z]:/i)) {
      return `file:///${normalizedPath}`;
    }
    return `file://${normalizedPath}`;
  };

  return (
    <div className="screenshots-detail-view">
      {/* Header */}
      <div className="screenshots-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            ← Back
          </button>
          <div className="title-section">
            <h1>{instanceName}</h1>
            <p className="screenshots-count">{screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      {loading ? (
        <div className="loading-state">
          <p>Loading screenshots...</p>
        </div>
      ) : screenshots.length === 0 ? (
        <div className="empty-state">
          <p>No screenshots found in this instance</p>
        </div>
      ) : (
        <div className="screenshots-gallery">
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              data-screenshot-id={screenshot.id}
              className="screenshot-thumbnail-wrapper"
              onClick={() => handleThumbnailClick(screenshot)}
              ref={(el) => {
                if (el && observerRef.current) {
                  observerRef.current.observe(el);
                }
              }}
            >
              <img
                src={getImageUrl(screenshot.filePath, screenshot.dataUri)}
                alt={screenshot.name}
                className="screenshot-thumbnail"
                title={screenshot.filename}
              />
              <div className="thumbnail-overlay">
                <span className="thumbnail-info">{screenshot.sizeFormatted}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedScreenshot && (
        <div className="screenshot-modal-backdrop" onClick={handleModalBackdropClick}>
          <div className="screenshot-modal">
            <button className="modal-close-button" onClick={handleCloseModal}>
              ✕
            </button>

            <div className="modal-content">
              <img
                src={getImageUrl(expandedScreenshot.filePath, expandedScreenshot.dataUri)}
                alt={expandedScreenshot.name}
                className="expanded-image"
              />
            </div>

            <div className="modal-metadata">
              <div className="metadata-row">
                <span className="metadata-label">Filename:</span>
                <span className="metadata-value">{expandedScreenshot.filename}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Size:</span>
                <span className="metadata-value">{expandedScreenshot.sizeFormatted}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Date Taken:</span>
                <span className="metadata-value">{expandedScreenshot.takenFormatted}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">Type:</span>
                <span className="metadata-value">{expandedScreenshot.extension.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotsDetailView;
