import React from 'react';
import UserMenu from '../UserMenu';

interface GlobalHeaderProps {
  appTitle: string;
  username: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode?: 'cards' | 'list';
  onViewModeToggle?: () => void;
  onScan: () => void;
  onShowAllSaves: () => void;
  onShowFolderManager: () => void;
  onLogout: () => void;
  isLoading?: boolean;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  appTitle,
  username,
  searchQuery,
  onSearchChange,
  viewMode = 'cards',
  onViewModeToggle,
  onScan,
  onShowAllSaves,
  onShowFolderManager,
  onLogout,
  isLoading = false,
}) => {
  return (
    <div className="global-header">
      <div className="header-left">
        <h1>⛏️ {appTitle}</h1>
        <p>{username}</p>
      </div>

      <div className="search-bar-container">
        <input
          type="text"
          placeholder="🔍 Search saves, instances..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-bar"
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => onSearchChange('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="header-right">
        {onViewModeToggle && (
          <button
            className="btn-secondary"
            onClick={onViewModeToggle}
            title={`Switch to ${viewMode === 'cards' ? 'List' : 'Card'} view`}
          >
            {viewMode === 'cards' ? '📋 List View' : '🎴 Card View'}
          </button>
        )}

        <button
          className="btn-primary"
          onClick={onScan}
          disabled={isLoading}
        >
          {isLoading ? 'Scanning...' : '🔄 Scan Saves'}
        </button>

        <button
          className="btn-secondary"
          onClick={onShowAllSaves}
          disabled={isLoading}
        >
          📚 All Saves
        </button>

        <button
          className="btn-secondary"
          onClick={onShowFolderManager}
          disabled={isLoading}
        >
          📁 Manage Folders
        </button>

        <UserMenu />

      </div>
    </div>
  );
};
