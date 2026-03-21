import React, { useState, useEffect } from 'react';
import SavesByInstance from './SavesByInstance';
import {
  PageContainer,
  PageHeader,
  MetadataGrid,
  MetadataItem,
  MetadataSection,
  TabNavigation,
  TabContent,
} from './shared';
import '../styles/InstanceDetailView.css';

interface Save {
  id: string;
  world_name: string;
  version: string;
  game_mode: string;
  difficulty?: number;
  seed?: number;
  last_played?: string;
  status: string;
  folder_name?: string;
  folder_id?: string;
}

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
}

interface InstanceDetailViewProps {
  instance: InstanceMetadata;
  saves: Save[];
  instancePath?: string;
  onBack: () => void;
  onSelectSave?: (save: Save) => void;
  onNavigateToAnalytics?: (save: Save) => void;
  onShowMods?: () => void;
  onShowResourcepacks?: () => void;
  onShowShaderpacks?: () => void;
  onShowScreenshots?: () => void;
  loading: boolean;
}

const loaderColors: Record<string, { bg: string; text: string; border: string }> = {
  vanilla: {
    bg: 'rgba(34, 197, 94, 0.1)',
    text: '#86efac',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  fabric: {
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#93c5fd',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  forge: {
    bg: 'rgba(249, 115, 22, 0.1)',
    text: '#fed7aa',
    border: 'rgba(249, 115, 22, 0.3)',
  },
  quilt: {
    bg: 'rgba(168, 85, 247, 0.1)',
    text: '#d8b4fe',
    border: 'rgba(168, 85, 247, 0.3)',
  },
};

export default function InstanceDetailView({
  instance,
  saves,
  instancePath,
  onBack,
  onSelectSave,
  onNavigateToAnalytics,
  onShowMods,
  onShowResourcepacks,
  onShowShaderpacks,
  onShowScreenshots,
  loading,
}: InstanceDetailViewProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [resourcepackCount, setResourcepackCount] = useState<number>(0);
  const [shaderpackCount, setShaderpackCount] = useState<number>(0);
  const [screenshotCount, setScreenshotCount] = useState<number>(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [mods, setMods] = useState<any[]>([]);
  const [loadingMods, setLoadingMods] = useState(false);
  const [activeTab, setActiveTab] = useState<'saves' | 'mods' | 'resourcepacks' | 'shaderpacks' | 'screenshots'>('saves');

  useEffect(() => {
    if (!instancePath) return;
    loadItemCounts();
  }, [instancePath]);

  const loadItemCounts = async () => {
    setLoadingCounts(true);
    try {
      const [rpsResult, spResult, ssResult] = await Promise.all([
        window.api.scanner.getInstanceResourcepacks(instancePath),
        window.api.scanner.getInstanceShaderpacks(instancePath),
        window.api.scanner.getInstanceScreenshots(instancePath),
      ]);

      if (rpsResult.success) {
        setResourcepackCount(rpsResult.resourcepacks?.length || 0);
      }
      if (spResult.success) {
        setShaderpackCount(spResult.shaderpacks?.length || 0);
      }
      if (ssResult.success) {
        setScreenshotCount(ssResult.screenshots?.length || 0);
      }
    } catch (error) {
      console.error('Error loading item counts:', error);
    } finally {
      setLoadingCounts(false);
    }
  };

  const loadMods = async () => {
    if (mods.length > 0 || loadingMods) return; // Already loaded or loading

    setLoadingMods(true);
    try {
      const result = await window.api.scanner.getInstanceMods(instancePath);
      if (result.success) {
        setMods(result.mods || []);
      }
    } catch (error) {
      console.error('Error loading mods:', error);
      setMods([]);
    } finally {
      setLoadingMods(false);
    }
  };

  console.log('🎮 InstanceDetailView render:', {
    instanceFolderId: instance.folder_id,
    instanceName: instance.display_name,
    totalSaves: saves.length,
    savesWithFolderId: saves.filter((s) => s.folder_id === instance.folder_id).length,
  });

  const colors = loaderColors[instance.mod_loader || 'vanilla'] || loaderColors.vanilla;
  const instanceSaves = saves.filter((s) => s.folder_id === instance.folder_id);

  if (!instance) {
    console.error('❌ No instance provided to InstanceDetailView');
    return <div>Error: No instance data</div>;
  }

  const handleLaunchInstance = async () => {
    setIsLaunching(true);
    setLaunchError(null);

    try {
      const launcherType = instance.launcher || 'unknown';
      const instanceName = instance.display_name || instance.instance_name || 'Instance';
      const path = instancePath || instance.folder_id;

      console.log(`🚀 Launching instance: ${instanceName} (${launcherType})`);

      const result = await window.api.scanner.launchInstance(launcherType, path, instanceName);

      if (!result.success) {
        setLaunchError(result.message);
        console.error('❌ Launch failed:', result.message);
      } else {
        console.log('✅ Launch successful:', result.message);
        // Show a success notification
        alert(result.message);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to launch instance';
      setLaunchError(errorMsg);
      console.error('❌ Launch error:', error);
    } finally {
      setIsLaunching(false);
    }
  };

  // Define tabs
  const tabs = [
    { id: 'saves', label: 'SAVES' },
    { id: 'mods', label: 'MODS' },
    { id: 'resourcepacks', label: 'RESOURCEPACKS' },
    { id: 'shaderpacks', label: 'SHADERPACKS' },
    { id: 'screenshots', label: 'SCREENSHOTS' },
  ];

  // Launch button for header
  const launchButton = instance.launcher && instance.launcher !== 'unknown' && instance.launcher !== 'direct' && (
    <button
      onClick={handleLaunchInstance}
      disabled={isLaunching}
      className="launch-button"
      title={`Launch with ${instance.launcher}`}
    >
      {isLaunching ? '🚀 Launching...' : '🚀 Launch Instance'}
    </button>
  );

  return (
    <PageContainer fullScreen>
      {/* Launch Error Message */}
      {launchError && (
        <div className="launch-error-banner">
          <span>⚠️ {launchError}</span>
          <button onClick={() => setLaunchError(null)} className="close-error">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title={`INSTANCE INFORMATION - ${instance.display_name || instance.instance_name || 'Instance'}`}
        onBack={onBack}
        rightContent={launchButton}
      />

      {/* Metadata Section */}
      <MetadataSection>
        <MetadataGrid>
          <MetadataItem
            label="Mod Loader"
            value={
              <div>
                <div className="loader-badge-large" style={{ backgroundColor: colors.bg, color: colors.text }}>
                  {instance.mod_loader.charAt(0).toUpperCase() + instance.mod_loader.slice(1)}
                </div>
                {instance.loader_version && (
                  <div className="metadata-subtext">v{instance.loader_version}</div>
                )}
              </div>
            }
          />

          {instance.game_version && (
            <MetadataItem
              label="Game Version"
              value={instance.game_version}
            />
          )}

          <MetadataItem
            label="Instance Type"
            value={`${instance.instance_type === 'modded' ? '🔧' : '⛏️'} ${instance.instance_type.charAt(0).toUpperCase() + instance.instance_type.slice(1)}`}
          />

          <MetadataItem
            label="Mods Installed"
            value={instance.mod_count}
            isClickable={!!onShowMods}
            onClick={onShowMods}
          />

          <MetadataItem
            label="Resourcepacks"
            value={resourcepackCount}
            isClickable={!!onShowResourcepacks}
            onClick={onShowResourcepacks}
          />

          <MetadataItem
            label="Shaderpacks"
            value={shaderpackCount}
            isClickable={!!onShowShaderpacks}
            onClick={onShowShaderpacks}
          />

          <MetadataItem
            label="Screenshots"
            value={screenshotCount}
            isClickable={!!onShowScreenshots}
            onClick={onShowScreenshots}
          />

          {instance.launcher && (
            <MetadataItem
              label="Launcher"
              value={
                instance.launcher === 'curseforge'
                  ? '🎮 CurseForge'
                  : instance.launcher === 'multimc'
                  ? '📦 MultiMC'
                  : instance.launcher === 'prismlauncher'
                  ? '🔮 Prism'
                  : instance.launcher === 'atlauncher'
                  ? '🚀 ATLauncher'
                  : '📁 Direct'
              }
            />
          )}

          {instance.folder_size_mb !== undefined && instance.folder_size_mb !== null && (
            <MetadataItem
              label="Folder Size"
              value={
                instance.folder_size_mb > 1024
                  ? (instance.folder_size_mb / 1024).toFixed(2) + ' GB'
                  : instance.folder_size_mb.toFixed(2) + ' MB'
              }
            />
          )}

          {instance.mods_folder_size_mb !== undefined && instance.mods_folder_size_mb !== null && instance.mods_folder_size_mb > 0 && (
            <MetadataItem
              label="Mods Size"
              value={
                instance.mods_folder_size_mb > 1024
                  ? (instance.mods_folder_size_mb / 1024).toFixed(2) + ' GB'
                  : instance.mods_folder_size_mb.toFixed(2) + ' MB'
              }
            />
          )}
        </MetadataGrid>
      </MetadataSection>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId as 'saves' | 'mods' | 'resourcepacks' | 'shaderpacks' | 'screenshots');
          if (tabId === 'mods') {
            loadMods();
          }
        }}
      />

      {/* Tab Content Sections */}
      <TabContent>
        {/* Saves Tab Content */}
        {activeTab === 'saves' && (
          <div className="tab-pane saves-section">
            {instanceSaves.length === 0 ? (
              <p className="no-saves-text">No saves found in this instance</p>
            ) : (
              <SavesByInstance
                saves={instanceSaves}
                instance={instance}
                onSelectSave={onSelectSave}
                onNavigateToAnalytics={onNavigateToAnalytics}
                loading={loading}
              />
            )}
          </div>
        )}

        {/* Mods Tab Content */}
        {activeTab === 'mods' && (
          <div className="tab-pane mods-section">
            {loadingMods ? (
              <div className="placeholder-content">
                <p>Loading mods...</p>
              </div>
            ) : mods.length > 0 ? (
              <div className="mods-grid">
                {mods.map((mod) => (
                  <div key={mod.id} className="mod-item">
                    <div className="mod-name">{mod.name}</div>
                    <div className="mod-size">{mod.sizeFormatted}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="placeholder-content empty">
                <p>No mods found</p>
              </div>
            )}
          </div>
        )}

        {/* Resourcepacks Tab Content */}
        {activeTab === 'resourcepacks' && (
          <div className="tab-pane resourcepacks-section">
            {resourcepackCount > 0 ? (
              <div className="placeholder-content">
                <p>🎨 {resourcepackCount} Resourcepack(s) Found</p>
              </div>
            ) : (
              <div className="placeholder-content empty">
                <p>No resourcepacks found</p>
              </div>
            )}
          </div>
        )}

        {/* Shaderpacks Tab Content */}
        {activeTab === 'shaderpacks' && (
          <div className="tab-pane shaderpacks-section">
            {shaderpackCount > 0 ? (
              <div className="placeholder-content">
                <p>✨ {shaderpackCount} Shaderpack(s) Found</p>
              </div>
            ) : (
              <div className="placeholder-content empty">
                <p>No shaderpacks found</p>
              </div>
            )}
          </div>
        )}

        {/* Screenshots Tab Content */}
        {activeTab === 'screenshots' && (
          <div className="tab-pane screenshots-section">
            {screenshotCount > 0 ? (
              <div className="placeholder-content">
                <p>📸 {screenshotCount} Screenshot(s) Found</p>
              </div>
            ) : (
              <div className="placeholder-content empty">
                <p>No screenshots found</p>
              </div>
            )}
          </div>
        )}
      </TabContent>
    </PageContainer>
  );
}
