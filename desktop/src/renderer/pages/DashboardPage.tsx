import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import SavesByInstance from '../components/SavesByInstance';
import InstanceDetailView from '../components/InstanceDetailView';
import ModsDetailView from '../components/ModsDetailView';
import ResourcepacksDetailView from '../components/ResourcepacksDetailView';
import ShadersDetailView from '../components/ShadersDetailView';
import ScreenshotsDetailView from '../components/ScreenshotsDetailView';
import { GlobalHeader } from '../components/shared/GlobalHeader';
import { SaveAnalyticsPage } from './SaveAnalyticsPage';
import AllSavesPage from './AllSavesPage';
import { FolderManager } from './FolderManager';
import MetricsPage from './MetricsPage';
import '../styles/DashboardPage.css';

interface InstanceMetadata {
  folder_id: string;
  mod_loader: string;
  loader_version?: string;
  game_version?: string;
  mod_count: number;
  icon_path?: string;
  instance_type: string;
  display_name: string;
  launcher?: string;
  instance_name?: string;
  folder_size_mb?: number;
  mods_folder_size_mb?: number;
  user_uuid?: string;
  folder_path?: string;
}

declare global {
  interface Window {
    api: any;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [saves, setSaves] = useState<any[]>([]);
  const [instanceMetadata, setInstanceMetadata] = useState<InstanceMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [selectedInstanceDetail, setSelectedInstanceDetail] = useState<InstanceMetadata | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [selectedInstanceMods, setSelectedInstanceMods] = useState<InstanceMetadata | null>(null);
  const [selectedInstanceResourcepacks, setSelectedInstanceResourcepacks] = useState<InstanceMetadata | null>(null);
  const [selectedInstanceShaderpacks, setSelectedInstanceShaderpacks] = useState<InstanceMetadata | null>(null);
  const [selectedInstanceScreenshots, setSelectedInstanceScreenshots] = useState<InstanceMetadata | null>(null);
  const [selectedSaveAnalytics, setSelectedSaveAnalytics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllSaves, setShowAllSaves] = useState(false);
  const [syncingInstanceId, setSyncingInstanceId] = useState<string | null>(null);
  const [selectedLoaderFilter, setSelectedLoaderFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'saves' | 'mods' | 'playtime'>('name');
  const [favoriteInstances, setFavoriteInstances] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; instanceId: string } | null>(null);

  // Load favorites from database on mount
  useEffect(() => {
    async function loadFavorites() {
      try {
        // Check if window.api is available (only in Electron context)
        if (!window.api || !window.api.favorites) {
          console.warn('⚠️ window.api not available - preload script may not be loaded');
          console.log('🔍 Window object keys:', Object.keys(window).slice(0, 10));
          return;
        }

        const result = await window.api.favorites.getAll();
        if (result.success) {
          setFavoriteInstances(new Set(result.favorites || []));
        } else {
          console.error('❌ Error loading favorites from database:', result.error);
        }
      } catch (error) {
        console.error('❌ Error loading favorites from database:', error);
      }
    }

    loadFavorites();
  }, []);

  useEffect(() => {
    console.log('📊 DashboardPage useEffect triggered - UUID:', currentUser?.minecraft_uuid);
    if (!currentUser?.minecraft_uuid) {
      console.warn('⚠️ No UUID available, skipping load');
      return;
    }
    loadSaves();
    loadInstanceMetadata();
  }, [currentUser?.minecraft_uuid]);

  // Update selectedInstanceDetail when instanceMetadata changes (after scan)
  useEffect(() => {
    if (selectedInstanceDetail) {
      const updatedInstance = instanceMetadata.find(
        (im) => im.folder_id === selectedInstanceDetail.folder_id
      );
      if (updatedInstance) {
        setSelectedInstanceDetail(updatedInstance);
      }
    }
  }, [instanceMetadata]);

  async function loadSaves() {
    try {
      console.log('🔄 loadSaves() called with UUID:', currentUser?.minecraft_uuid);
      setLoading(true);
      const uuid = currentUser?.minecraft_uuid;
      if (!uuid) {
        console.warn('⚠️ UUID is undefined, cannot fetch saves');
        return;
      }
      const token = localStorage.getItem('minecraft_tracker_auth_token');
      console.log('🔑 [loadSaves] Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'null/undefined');
      const result = await window.api.scanner.getSaves(uuid, token);

      console.log('✅ getSaves result:', { success: result.success, savesCount: result.saves?.length || 0, error: result.error });
      if (result.success) {
        setSaves(result.saves || []);
        console.log('📊 Saves loaded successfully:', result.saves?.length || 0, 'saves');
      } else {
        console.error('❌ getSaves failed:', result.error);
        setError(result.error || 'Failed to load saves');
      }
    } catch (err: any) {
      console.error('❌ Error in loadSaves:', err);
      setError(err.message || 'Error loading saves');
    } finally {
      setLoading(false);
    }
  }

  async function loadInstanceMetadata() {
    try {
      console.log('🔄 loadInstanceMetadata() called with UUID:', currentUser?.minecraft_uuid);
      const uuid = currentUser?.minecraft_uuid;
      if (!uuid) {
        console.warn('⚠️ UUID is undefined, cannot fetch instance metadata');
        return;
      }
      const token = localStorage.getItem('minecraft_tracker_auth_token');
      const result = await window.api.scanner.getInstanceMetadata(uuid, token);
      console.log('✅ getInstanceMetadata result:', { success: result.success, metadataCount: result.metadata?.length || 0, error: result.error });
      if (result.success) {
        setInstanceMetadata(result.metadata || []);
        console.log('📊 Instance metadata loaded successfully:', result.metadata?.length || 0, 'instances');
      } else {
        console.error('❌ getInstanceMetadata failed:', result.error);
      }
    } catch (err: any) {
      console.error('❌ Error loading instance metadata:', err);
    }
  }

  async function handleScanSaves() {
    try {
      setLoading(true);
      setError(null);

      // Scan all configured folders (or default if none configured)
      const result = await window.api.scanner.scanAllFolders(currentUser?.minecraft_uuid);

      if (result.success) {
        // Reload saves from database to get all scanned saves
        await loadSaves();
        await loadInstanceMetadata();
        setLastScanTime(new Date());
      } else {
        setError(result.error || 'Failed to scan saves');
      }
    } catch (err: any) {
      setError(err.message || 'Error scanning saves');
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncInstance(folderId: string) {
    try {
      setSyncingInstanceId(folderId);
      setError(null);

      // Scan just this specific folder
      const result = await window.api.scanner.scanFolder(folderId, currentUser?.minecraft_uuid);

      if (result.success) {
        // Reload saves from database
        await loadSaves();
        await loadInstanceMetadata();
        setLastScanTime(new Date());
      } else {
        setError(result.error || 'Failed to sync instance');
      }
    } catch (err: any) {
      setError(err.message || 'Error syncing instance');
    } finally {
      setSyncingInstanceId(null);
    }
  }


  async function handleLogout() {
    try {
      if (window.confirm('Are you sure you want to log out?')) {
        await window.api.auth.logout();
        navigate('/login');
      }
    } catch (err: any) {
      setError('Failed to logout: ' + err.message);
    }
  }

  function handleInstanceCardClick(instance: InstanceMetadata) {
    console.log('🎮 Instance card clicked:', {
      folderId: instance.folder_id,
      displayName: instance.display_name,
      launcher: instance.launcher,
      modLoader: instance.mod_loader,
    });
    setSelectedInstanceDetail(instance);
  }

  async function toggleFavorite(folderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const isFavorited = favoriteInstances.has(folderId);

    try {
      if (isFavorited) {
        // Remove from favorites
        const result = await window.api.favorites.remove(folderId);
        if (result.success) {
          const newFavorites = new Set(favoriteInstances);
          newFavorites.delete(folderId);
          setFavoriteInstances(newFavorites);
        } else {
          console.error('❌ Error removing favorite:', result.error);
        }
      } else {
        // Add to favorites
        const result = await window.api.favorites.add(folderId);
        if (result.success) {
          const newFavorites = new Set(favoriteInstances);
          newFavorites.add(folderId);
          setFavoriteInstances(newFavorites);
        } else {
          console.error('❌ Error adding favorite:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  }

  async function handleContextMenuAction(action: string, instanceId: string) {
    const instance = instanceMetadata.find((im) => im.folder_id === instanceId);
    if (!instance) return;

    switch (action) {
      case 'view-details':
        handleInstanceCardClick(instance);
        break;
      case 'open-folder':
        window.api.shell?.openPath(instance.folder_path || '');
        break;
      case 'resync':
        handleSyncInstance(instanceId);
        break;
      case 'toggle-favorite':
        try {
          const isFavorited = favoriteInstances.has(instanceId);
          if (isFavorited) {
            const result = await window.api.favorites.remove(instanceId);
            if (result.success) {
              const newFavorites = new Set(favoriteInstances);
              newFavorites.delete(instanceId);
              setFavoriteInstances(newFavorites);
            }
          } else {
            const result = await window.api.favorites.add(instanceId);
            if (result.success) {
              const newFavorites = new Set(favoriteInstances);
              newFavorites.add(instanceId);
              setFavoriteInstances(newFavorites);
            }
          }
        } catch (error) {
          console.error('❌ Error toggling favorite:', error);
        }
        break;
      case 'view-mods':
        setSelectedInstanceMods(instance);
        break;
      case 'view-saves':
        setShowAllSaves(true);
        break;
    }
    setContextMenu(null);
  }

  // Filter and sort instances
  const filteredInstanceMetadata = instanceMetadata
    .filter((instance) => {
      // Favorites filter
      if (showFavoritesOnly && !favoriteInstances.has(instance.folder_id)) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const searchTerm = searchQuery.toLowerCase();
        const matchesSearch = (
          (instance.display_name || '').toLowerCase().includes(searchTerm) ||
          (instance.instance_name || '').toLowerCase().includes(searchTerm) ||
          (instance.mod_loader || '').toLowerCase().includes(searchTerm) ||
          (instance.launcher || '').toLowerCase().includes(searchTerm)
        );
        if (!matchesSearch) return false;
      }
      // Mod loader filter
      if (selectedLoaderFilter && instance.mod_loader !== selectedLoaderFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aSaves = saves.filter((s) => s.folder_id === a.folder_id).length;
      const bSaves = saves.filter((s) => s.folder_id === b.folder_id).length;
      const aPlaytime = saves.filter((s) => s.folder_id === a.folder_id).reduce((sum, s) => sum + (s.play_time_ticks || 0), 0);
      const bPlaytime = saves.filter((s) => s.folder_id === b.folder_id).reduce((sum, s) => sum + (s.play_time_ticks || 0), 0);

      switch (sortBy) {
        case 'name':
          return (a.display_name || '').localeCompare(b.display_name || '');
        case 'saves':
          return bSaves - aSaves;
        case 'mods':
          return (b.mod_count || 0) - (a.mod_count || 0);
        case 'playtime':
          return bPlaytime - aPlaytime;
        default:
          return 0;
      }
    });

  // Filter saves based on search query
  const filteredSaves = searchQuery.trim()
    ? saves.filter((save) => {
        const searchTerm = searchQuery.toLowerCase();
        return (
          (save.world_name || '').toLowerCase().includes(searchTerm) ||
          (save.version || '').toLowerCase().includes(searchTerm) ||
          (save.game_mode || '').toLowerCase().includes(searchTerm)
        );
      })
    : saves;

  // Calculate summary stats
  const totalSaves = saves.length;
  const totalInstances = new Set(saves.map((s) => s.folder_id)).size;
  const totalPlaytime = saves.reduce((sum, s) => sum + (s.play_time_ticks || 0), 0);
  const playtimeDays = (totalPlaytime / 24000).toFixed(1);

  // Debug: Log current state
  console.log('🎮 DashboardPage render - selectedSaveAnalytics:', !!selectedSaveAnalytics, selectedSaveAnalytics?.world_name);

  // Show save analytics page if requested
  if (selectedSaveAnalytics) {
    console.log('📊 Showing SaveAnalyticsPage with save:', {
      id: selectedSaveAnalytics.id,
      world_name: selectedSaveAnalytics.world_name,
      version: selectedSaveAnalytics.version,
      game_mode: selectedSaveAnalytics.game_mode,
      hasPlayerData: !!(selectedSaveAnalytics.health || selectedSaveAnalytics.hunger),
      keys: Object.keys(selectedSaveAnalytics).length,
    });
    return (
      <div className="dashboard-page">
        <GlobalHeader
          appTitle="Beacon"
          username={currentUser?.username || 'User'}
          onScan={handleScanSaves}
          onShowFolderManager={() => setShowFolderManager(true)}
          onLogout={handleLogout}
          isLoading={loading}
          showActionButtons={true}
        />

        <div className="dashboard-content">
          <SaveAnalyticsPage
            saveData={selectedSaveAnalytics}
            onBack={() => setSelectedSaveAnalytics(null)}
          />
        </div>
      </div>
    );
  }

  // Show all saves page if requested
  if (showAllSaves) {
    return (
      <div className="dashboard-page">
        <GlobalHeader
          appTitle="Beacon"
          username={currentUser?.username || 'User'}
          onScan={handleScanSaves}
          onShowFolderManager={() => setShowFolderManager(true)}
          onLogout={handleLogout}
          isLoading={loading}
          showActionButtons={true}
        />

        <div className="dashboard-content">
          <AllSavesPage
            saves={saves}
            onBack={() => setShowAllSaves(false)}
          />
        </div>
      </div>
    );
  }

  // Show metrics page if requested
  if (showMetrics) {
    return (
      <div className="dashboard-page">
        <GlobalHeader
          appTitle="Beacon"
          username={currentUser?.username || 'User'}
          onScan={handleScanSaves}
          onShowFolderManager={() => setShowFolderManager(true)}
          onLogout={handleLogout}
          isLoading={loading}
          showActionButtons={true}
        />

        <div className="dashboard-content">
          <MetricsPage
            saves={saves}
            instanceMetadata={instanceMetadata}
            onBack={() => setShowMetrics(false)}
            onInstanceClick={(instance) => {
              setShowMetrics(false);
              setSelectedInstanceDetail(instance);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <GlobalHeader
        appTitle="Beacon"
        username={currentUser?.username || 'User'}
        onScan={handleScanSaves}
        onShowFolderManager={() => setShowFolderManager(true)}
        onLogout={handleLogout}
        isLoading={loading}
        showActionButtons={false}
      />

      {error && <div className="error-message">{error}</div>}

      {/* Card View - Summary Stats and Instance Overview */}
      {viewMode === 'cards' && !selectedInstanceDetail && (
        <div className="dashboard-scrollable">
          {/* Summary Stats */}
          <div className="stats-grid">
            <div className="stat-card" onClick={() => setShowMetrics(true)} style={{ cursor: 'pointer' }}>
              <div className="stat-value">{searchQuery ? filteredSaves.length : totalSaves}</div>
              <div className="stat-label">{searchQuery ? 'Matching Saves' : 'Total Saves'}</div>
            </div>
            <div className="stat-card" onClick={() => setShowMetrics(true)} style={{ cursor: 'pointer' }}>
              <div className="stat-value">{searchQuery ? filteredInstanceMetadata.length : totalInstances}</div>
              <div className="stat-label">{searchQuery ? 'Matching Instances' : 'Instances'}</div>
            </div>
            <div className="stat-card" onClick={() => setShowMetrics(true)} style={{ cursor: 'pointer' }}>
              <div className="stat-value">
                {searchQuery
                  ? ((filteredSaves.reduce((sum, s) => sum + (s.play_time_ticks || 0), 0) / 24000).toFixed(1))
                  : playtimeDays
                }
              </div>
              <div className="stat-label">{searchQuery ? 'Matching Playtime' : 'Days Played'}</div>
            </div>
            {lastScanTime && (
              <div className="stat-card">
                <div className="stat-value">✓</div>
                <div className="stat-label">
                  Last scan: {lastScanTime.toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          {/* Instance Overview - Always show header, conditionally show grid */}
          <div className="instances-overview">
            <div className="instances-header">
              <h2>Instances {searchQuery && `(${filteredInstanceMetadata.length} matches)`}</h2>
              <div className="instances-controls">
                {/* Search Bar */}
                <div className="search-group">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="🔍 Search instances..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    title="Search instances by name, version, or loader"
                  />
                  {searchQuery && (
                    <button
                      className="clear-search-btn"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* View Mode Toggle */}
                <div className="filter-group">
                  <button
                    className={`filter-btn ${viewMode === 'cards' ? 'active' : ''}`}
                    onClick={() => setViewMode('cards')}
                    title="Show as cards"
                  >
                    🎴 Cards
                  </button>
                  <button
                    className={`filter-btn ${(viewMode as 'cards' | 'list') === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="Show as list"
                  >
                    📋 List
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="filter-group">
                  <button
                    className="filter-btn"
                    onClick={handleScanSaves}
                    disabled={loading}
                    title="Scan all instances for saves"
                  >
                    {loading ? '⟳ Scanning...' : '🔄 Scan'}
                  </button>
                  <button
                    className="filter-btn"
                    onClick={() => setShowFolderManager(true)}
                    disabled={loading}
                    title="Manage save folders"
                  >
                    📁 Manage Folders
                  </button>
                </div>

                {/* Favorites Filter */}
                <div className="filter-group">
                  <button
                    className={`filter-btn ${showFavoritesOnly ? 'active' : ''}`}
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    title="Toggle favorites filter"
                  >
                    ⭐ Favorites
                  </button>
                </div>

                {/* Mod Loader Filter */}
                <div className="filter-group">
                  <span className="filter-label">Loader:</span>
                  <div className="filter-buttons">
                    <button
                      className={`filter-btn ${!selectedLoaderFilter ? 'active' : ''}`}
                      onClick={() => setSelectedLoaderFilter(null)}
                    >
                      All
                    </button>
                    <button
                      className={`filter-btn ${selectedLoaderFilter === 'fabric' ? 'active' : ''}`}
                      onClick={() => setSelectedLoaderFilter('fabric')}
                    >
                      Fabric
                    </button>
                    <button
                      className={`filter-btn ${selectedLoaderFilter === 'forge' ? 'active' : ''}`}
                      onClick={() => setSelectedLoaderFilter('forge')}
                    >
                      Forge
                    </button>
                    <button
                      className={`filter-btn ${selectedLoaderFilter === 'vanilla' ? 'active' : ''}`}
                      onClick={() => setSelectedLoaderFilter('vanilla')}
                    >
                      Vanilla
                    </button>
                    <button
                      className={`filter-btn ${selectedLoaderFilter === 'quilt' ? 'active' : ''}`}
                      onClick={() => setSelectedLoaderFilter('quilt')}
                    >
                      Quilt
                    </button>
                  </div>
                </div>

                {/* Sort Options */}
                <div className="sort-group">
                  <span className="filter-label">Sort:</span>
                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="name">Name</option>
                    <option value="saves">Saves Count</option>
                    <option value="mods">Mods Count</option>
                    <option value="playtime">Playtime</option>
                  </select>
                </div>
              </div>
            </div>
            {viewMode === 'cards' ? (
              filteredInstanceMetadata.length > 0 ? (
              <>
                <div className="instances-grid">
                  {filteredInstanceMetadata.map((instance) => {
                    const instanceSaves = filteredSaves.filter((s) => s.folder_id === instance.folder_id);
                    const instancePlaytime = instanceSaves.reduce((sum, s) => sum + (s.play_time_ticks || 0), 0);

                    return (
                      <div
                        key={instance.folder_id}
                        className="instance-overview-card"
                        onClick={() => handleInstanceCardClick(instance)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, instanceId: instance.folder_id });
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="instance-header-info">
                          <div className="instance-title-row">
                            <h3>{instance.display_name}</h3>
                            {syncingInstanceId === instance.folder_id ? (
                              <span className="launcher-icon" title="Syncing...">
                                ⟳
                              </span>
                            ) : instance.launcher ? (
                              <span className="launcher-icon" title={instance.launcher}>
                                {instance.launcher === 'curseforge'
                                  ? '🎮'
                                  : instance.launcher === 'multimc'
                                  ? '📦'
                                  : instance.launcher === 'prismlauncher'
                                  ? '🔮'
                                  : instance.launcher === 'atlauncher'
                                  ? '🚀'
                                  : '📁'}
                              </span>
                            ) : null}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className={`loader-badge loader-${instance.mod_loader}`}>
                              {instance.mod_loader.charAt(0).toUpperCase() + instance.mod_loader.slice(1)}
                              {instance.loader_version && ` v${instance.loader_version}`}
                            </span>
                            <button
                              className={`instance-favorite-btn ${favoriteInstances.has(instance.folder_id) ? 'active' : ''}`}
                              onClick={(e) => toggleFavorite(instance.folder_id, e)}
                              title={favoriteInstances.has(instance.folder_id) ? 'Remove from favorites' : 'Add to favorites'}
                              style={{ padding: '4px 10px', fontSize: '14px' }}
                            >
                              {favoriteInstances.has(instance.folder_id) ? '⭐' : '☆'}
                            </button>
                            <button
                              className="instance-sync-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSyncInstance(instance.folder_id);
                              }}
                              disabled={syncingInstanceId === instance.folder_id}
                              title="Rescan this instance"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              {syncingInstanceId === instance.folder_id ? '⟳' : '⟳'}
                            </button>
                          </div>
                        </div>

                        <div className="instance-meta">
                          <div className="meta-item">
                            <span className="meta-label">Saves</span>
                            <span className="meta-value">{instanceSaves.length}</span>
                          </div>
                          <div
                            className="meta-item clickable"
                            onClick={() => setSelectedInstanceMods(instance)}
                            style={{ cursor: 'pointer' }}
                            title="Click to view mods"
                          >
                            <span className="meta-label">Mods</span>
                            <span className="meta-value">{instance.mod_count}</span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-label">Version</span>
                            <span className="meta-value">{instance.game_version || 'N/A'}</span>
                          </div>
                          <div className="instance-playtime" style={{ marginTop: 0, padding: '0 8px' }}>
                            {(instancePlaytime / 24000).toFixed(1)}d
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {contextMenu && (
                  <div
                    className="context-menu"
                    style={{
                      position: 'fixed',
                      top: `${contextMenu.y}px`,
                      left: `${contextMenu.x}px`,
                      zIndex: 1000,
                    }}
                    onMouseLeave={() => setContextMenu(null)}
                  >
                    <div
                      className="context-menu-item"
                      onClick={() => handleContextMenuAction('view-details', contextMenu.instanceId)}
                    >
                      👁️ View Details
                    </div>
                    <div
                      className="context-menu-item"
                      onClick={() => handleContextMenuAction('toggle-favorite', contextMenu.instanceId)}
                    >
                      {favoriteInstances.has(contextMenu.instanceId) ? '✕ Remove Favorite' : '⭐ Add to Favorites'}
                    </div>
                    <div
                      className="context-menu-item"
                      onClick={() => handleContextMenuAction('view-mods', contextMenu.instanceId)}
                    >
                      📦 View Mods
                    </div>
                    <div
                      className="context-menu-item"
                      onClick={() => handleContextMenuAction('view-saves', contextMenu.instanceId)}
                    >
                      💾 View Saves
                    </div>
                    <div
                      className="context-menu-item"
                      onClick={() => handleContextMenuAction('resync', contextMenu.instanceId)}
                    >
                      🔄 Rescan Instance
                    </div>
                    <div
                      className="context-menu-item"
                      onClick={() => handleContextMenuAction('open-folder', contextMenu.instanceId)}
                    >
                      📁 Open Folder
                    </div>
                  </div>
                )}
              </>
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No instances match your filters</p>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>
                    Try adjusting your search terms, filters, or loader selection
                  </p>
                </div>
              )
            ) : viewMode === 'list' ? (
              <div>
                <h3 style={{ marginTop: '24px', marginBottom: '16px', color: '#e2e8f0' }}>
                  {searchQuery ? `Matching Saves (${filteredSaves.length})` : `All Saves (${totalSaves})`}
                </h3>
                <SavesByInstance
                  saves={filteredSaves}
                  onNavigateToAnalytics={setSelectedSaveAnalytics}
                  loading={loading}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Global click handler to close context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Mods Detail View */}
      {selectedInstanceMods ? (
        <div className="dashboard-content">
          <ModsDetailView
            instanceName={selectedInstanceMods.display_name || selectedInstanceMods.instance_name || 'Instance'}
            instancePath={selectedInstanceMods.folder_path || selectedInstanceMods.folder_id}
            onBack={() => setSelectedInstanceMods(null)}
          />
        </div>
      ) : selectedInstanceResourcepacks ? (
        <div className="dashboard-content">
          <ResourcepacksDetailView
            instanceName={selectedInstanceResourcepacks.display_name || selectedInstanceResourcepacks.instance_name || 'Instance'}
            instancePath={selectedInstanceResourcepacks.folder_path || selectedInstanceResourcepacks.folder_id}
            onBack={() => setSelectedInstanceResourcepacks(null)}
          />
        </div>
      ) : selectedInstanceShaderpacks ? (
        <div className="dashboard-content">
          <ShadersDetailView
            instanceName={selectedInstanceShaderpacks.display_name || selectedInstanceShaderpacks.instance_name || 'Instance'}
            instancePath={selectedInstanceShaderpacks.folder_path || selectedInstanceShaderpacks.folder_id}
            onBack={() => setSelectedInstanceShaderpacks(null)}
          />
        </div>
      ) : selectedInstanceScreenshots ? (
        <div className="dashboard-content">
          <ScreenshotsDetailView
            instanceName={selectedInstanceScreenshots.display_name || selectedInstanceScreenshots.instance_name || 'Instance'}
            instancePath={selectedInstanceScreenshots.folder_path || selectedInstanceScreenshots.folder_id}
            onBack={() => setSelectedInstanceScreenshots(null)}
          />
        </div>
      ) : selectedInstanceDetail ? (
        <div className="dashboard-content">
          <InstanceDetailView
            instance={selectedInstanceDetail}
            saves={saves}
            instancePath={selectedInstanceDetail.folder_path}
            onBack={() => setSelectedInstanceDetail(null)}
                onNavigateToAnalytics={setSelectedSaveAnalytics}
            onShowMods={() => setSelectedInstanceMods(selectedInstanceDetail)}
            onShowResourcepacks={() => setSelectedInstanceResourcepacks(selectedInstanceDetail)}
            onShowShaderpacks={() => setSelectedInstanceShaderpacks(selectedInstanceDetail)}
            onShowScreenshots={() => setSelectedInstanceScreenshots(selectedInstanceDetail)}
            loading={loading}
          />
        </div>
      ) : null}

      {showFolderManager && currentUser?.minecraft_uuid && (
        <FolderManager
          userUuid={currentUser.minecraft_uuid}
          onClose={() => setShowFolderManager(false)}
          onFoldersChanged={async () => {
            // Automatically trigger a scan when folders are changed
            try {
              setLoading(true);
              const result = await window.api.scanner.scanAllFolders(currentUser.minecraft_uuid);
              if (result.success) {
                await loadSaves();
                await loadInstanceMetadata();
                setLastScanTime(new Date());
              }
            } catch (err) {
              console.error('Auto-scan failed:', err);
              // Fallback to just reloading data
              await loadSaves();
              await loadInstanceMetadata();
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

    </div>
  );
}
