import React, { useState } from 'react';
import '../styles/MetricsPage.css';

interface MetricsPageProps {
  saves: any[];
  instanceMetadata: any[];
  onBack: () => void;
  onInstanceClick?: (instance: any) => void;
}

type SortField = 'name' | 'loader' | 'mods' | 'saves' | 'playtime';
type SortDirection = 'asc' | 'desc';

export default function MetricsPage({ saves, instanceMetadata, onBack, onInstanceClick }: MetricsPageProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // Calculate metrics
  const totalSaves = saves.length;
  const totalInstances = instanceMetadata.length;
  const totalPlaytime = saves.reduce((sum, s) => sum + (s.play_time_ticks || 0), 0);
  const playtimeDays = (totalPlaytime / 24000).toFixed(1);

  // Saves by status
  const savesByStatus = saves.reduce((acc, save) => {
    const status = save.status || 'active';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Saves by game mode
  const savesByMode = saves.reduce((acc, save) => {
    const mode = save.game_mode || 'unknown';
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Instances by mod loader
  const instancesByLoader = instanceMetadata.reduce((acc, instance) => {
    const loader = instance.mod_loader || 'vanilla';
    acc[loader] = (acc[loader] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Instance data with stats
  const instanceStats = instanceMetadata.map((instance) => {
    const instanceSaves = saves.filter((s) => s.folder_id === instance.folder_id);
    const playtime = instanceSaves.reduce((sum, s) => sum + (s.play_time_ticks || 0), 0);
    return {
      ...instance,
      saveCount: instanceSaves.length,
      playtimeDays: (playtime / 24000).toFixed(1),
    };
  });

  // Sort instances based on current sort field and direction
  const sortedInstanceStats = [...instanceStats].sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';

    switch (sortField) {
      case 'name':
        aVal = a.display_name || a.instance_name || '';
        bVal = b.display_name || b.instance_name || '';
        break;
      case 'loader':
        aVal = a.mod_loader || '';
        bVal = b.mod_loader || '';
        break;
      case 'mods':
        aVal = a.mod_count || 0;
        bVal = b.mod_count || 0;
        break;
      case 'saves':
        aVal = a.saveCount || 0;
        bVal = b.saveCount || 0;
        break;
      case 'playtime':
        aVal = parseFloat(a.playtimeDays) || 0;
        bVal = parseFloat(b.playtimeDays) || 0;
        break;
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="metrics-page">
      <div className="metrics-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h1>📊 Analytics & Metrics</h1>
      </div>

      {/* Overview Cards */}
      <div className="metrics-overview">
        <div className="metric-card">
          <div className="metric-value">{totalSaves}</div>
          <div className="metric-label">Total Saves</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{totalInstances}</div>
          <div className="metric-label">Instances</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{playtimeDays}</div>
          <div className="metric-label">Days Played</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{Math.round(totalSaves / Math.max(totalInstances, 1))}</div>
          <div className="metric-label">Saves per Instance</div>
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="metrics-grid">
        {/* Saves by Status */}
        <div className="metrics-section">
          <h2>Saves by Status</h2>
          <div className="metric-list">
            {(Object.entries(savesByStatus) as [string, number][]).map(([status, count]) => (
              <div key={status} className="metric-row">
                <span className={`status-label status-${status}`}>{status}</span>
                <span className="metric-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Saves by Game Mode */}
        <div className="metrics-section">
          <h2>Saves by Game Mode</h2>
          <div className="metric-list">
            {(Object.entries(savesByMode) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([mode, count]) => (
                <div key={mode} className="metric-row">
                  <span className="mode-label">{mode}</span>
                  <span className="metric-count">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Instances by Mod Loader */}
        <div className="metrics-section">
          <h2>Instances by Mod Loader</h2>
          <div className="metric-list">
            {(Object.entries(instancesByLoader) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([loader, count]) => (
                <div key={loader} className="metric-row">
                  <span className={`loader-label loader-${loader}`}>{loader}</span>
                  <span className="metric-count">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Instance Details Table */}
      {instanceStats.length > 0 && (
        <div className="metrics-section full-width">
          <h2>Instance Details</h2>
          <table className="metrics-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSortClick('name')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Instance{getSortIndicator('name')}
                </th>
                <th
                  onClick={() => handleSortClick('loader')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Mod Loader{getSortIndicator('loader')}
                </th>
                <th
                  onClick={() => handleSortClick('mods')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Mods{getSortIndicator('mods')}
                </th>
                <th
                  onClick={() => handleSortClick('saves')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Saves{getSortIndicator('saves')}
                </th>
                <th
                  onClick={() => handleSortClick('playtime')}
                  style={{ cursor: 'pointer' }}
                  title="Click to sort"
                >
                  Playtime (Days){getSortIndicator('playtime')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedInstanceStats.map((instance) => (
                <tr
                  key={instance.folder_id}
                  onClick={() => onInstanceClick?.(instance)}
                  style={{ cursor: onInstanceClick ? 'pointer' : 'default' }}
                  title={onInstanceClick ? 'Click to view instance details' : undefined}
                >
                  <td className="instance-name">{instance.display_name}</td>
                  <td>
                    <span className={`loader-badge loader-${instance.mod_loader}`}>
                      {instance.mod_loader}
                    </span>
                  </td>
                  <td>{instance.mod_count}</td>
                  <td>{instance.saveCount}</td>
                  <td>{instance.playtimeDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
