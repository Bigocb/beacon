import React from 'react';
import UserMenu from '../UserMenu';

interface GlobalHeaderProps {
  appTitle: string;
  username: string;
  viewMode?: 'cards' | 'list';
  onViewModeToggle?: () => void;
  onScan: () => void;
  onShowFolderManager: () => void;
  onLogout: () => void;
  isLoading?: boolean;
  showActionButtons?: boolean; // Show Scan and Manage Folders buttons
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  appTitle,
  username,
  viewMode = 'cards',
  onViewModeToggle,
  onScan,
  onShowFolderManager,
  onLogout,
  isLoading = false,
  showActionButtons = true,
}) => {
  return (
    <div className="global-header">
      <div className="header-left">
        <h1>⛏️ {appTitle}</h1>
        <p>{username}</p>
      </div>


      <div className="header-right">
        {showActionButtons && (
          <>
            <button
              className="btn-primary"
              onClick={onScan}
              disabled={isLoading}
            >
              {isLoading ? 'Scanning...' : '🔄 Scan Saves'}
            </button>

            <button
              className="btn-secondary"
              onClick={onShowFolderManager}
              disabled={isLoading}
            >
              📁 Manage Folders
            </button>
          </>
        )}

        <UserMenu />

      </div>
    </div>
  );
};
