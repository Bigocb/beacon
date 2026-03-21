import React, { useState, useMemo } from 'react';
import '../styles/AdvancementsTab.css';

export interface AdvancementData {
  key: string;
  criteria: Record<string, string>; // {"criterion_name": "YYYY-MM-DD HH:MM:SS Z"}
  done: boolean;
}

interface AdvancementsTabProps {
  advancements: Record<string, AdvancementData>;
  loading?: boolean;
}

/**
 * Format advancement key to readable title
 * minecraft:story/obtain_tool -> Obtain Tool
 * jodek:craft/spawn_eggs -> Spawn Eggs
 */
const formatAdvancementTitle = (key: string): string => {
  // Extract the part after the colon (mod namespace) if it exists
  const afterColon = key.includes(':') ? key.split(':')[1] : key;

  return afterColon
    .split('/')
    .pop() // Get last part after /
    ?.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || key;
};

/**
 * Get emoji for advancement category
 */
const getCategoryEmoji = (key: string): string => {
  if (key.includes('story')) return '📖';
  if (key.includes('adventure')) return '🗺️';
  if (key.includes('husbandry')) return '🐕';
  if (key.includes('nether')) return '🔥';
  if (key.includes('end')) return '👑';
  if (key.includes('recipes')) return '📚';
  return '🏆';
};

/**
 * Get category name from advancement key
 */
const getCategoryName = (key: string): string => {
  const parts = key.split(':')[1]?.split('/') || [];
  const category = parts[0] || 'other';
  return category.charAt(0).toUpperCase() + category.slice(1);
};

/**
 * Extract mod name from advancement key
 * basicweapons:recipes/got_gold_ingot -> basicweapons
 */
const getModName = (key: string): string => {
  const modName = key.split(':')[0];
  return modName === 'minecraft' ? 'Minecraft' : modName.charAt(0).toUpperCase() + modName.slice(1);
};

/**
 * Parse advancement timestamp
 * Format: "2025-01-19 20:36:06 -0500"
 */
const parseTimestamp = (timeStr: string): Date => {
  try {
    return new Date(timeStr);
  } catch {
    return new Date();
  }
};

export const AdvancementsTab: React.FC<AdvancementsTabProps> = ({ advancements, loading = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMod, setSelectedMod] = useState<string | null>(null);
  const [expandedAdvancements, setExpandedAdvancements] = useState<Set<string>>(new Set());

  // Get completed advancements
  const completedAdvancements = useMemo(() => {
    return Object.entries(advancements)
      .filter(([_, data]) => data.done)
      .map(([key, data]) => ({
        key,
        title: formatAdvancementTitle(key),
        category: getCategoryName(key),
        modName: getModName(key),
        emoji: getCategoryEmoji(key),
        criteria: data.criteria,
        timestamp: Object.values(data.criteria)[0] ? parseTimestamp(Object.values(data.criteria)[0] as string) : new Date(),
      }));
  }, [advancements]);

  // Filter by search, category, and mod
  const filteredAdvancements = useMemo(() => {
    let filtered = completedAdvancements;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(adv =>
        adv.title.toLowerCase().includes(query) ||
        adv.key.toLowerCase().includes(query) ||
        adv.category.toLowerCase().includes(query) ||
        adv.modName.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(adv => adv.category === selectedCategory);
    }

    if (selectedMod) {
      filtered = filtered.filter(adv => adv.modName === selectedMod);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [completedAdvancements, searchQuery, selectedCategory, selectedMod]);

  // Get unique categories and mods
  const categories = useMemo(() => {
    const cats = new Set(completedAdvancements.map(a => a.category));
    return Array.from(cats).sort();
  }, [completedAdvancements]);

  const mods = useMemo(() => {
    let categoryAdvancements = completedAdvancements;
    if (selectedCategory) {
      categoryAdvancements = completedAdvancements.filter(a => a.category === selectedCategory);
    }
    const modSet = new Set(categoryAdvancements.map(a => a.modName));
    return Array.from(modSet).sort();
  }, [completedAdvancements, selectedCategory]);

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedAdvancements);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedAdvancements(newExpanded);
  };

  if (loading) {
    return (
      <div className="advancements-tab">
        <div className="advancements-loading">Loading advancements...</div>
      </div>
    );
  }

  const totalAdvancements = Object.keys(advancements).length;
  const completedCount = completedAdvancements.length;
  const completionPercent = Math.round((completedCount / Math.max(totalAdvancements, 1)) * 100);

  return (
    <div className="advancements-tab">
      {/* Header with stats */}
      <div className="advancements-header">
        <div className="advancements-stats">
          <h2>🏆 Advancements</h2>
          <div className="advancements-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${completionPercent}%` }} />
            </div>
            <span className="progress-text">{completedCount} / {totalAdvancements} ({completionPercent}%)</span>
          </div>
        </div>

      </div>

      {/* Search and Filter Controls */}
      <div className="advancements-search-filters">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="🔍 Search advancements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Category dropdown */}
        {categories.length > 0 && (
          <div className="filter-group">
            <select
              className="filter-dropdown"
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
            >
              <option value="">All Categories</option>
              {categories.map(category => {
                const count = completedAdvancements.filter(a => a.category === category).length;
                return (
                  <option key={category} value={category}>
                    {category} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Mod dropdown */}
        {mods.length > 0 && (
          <div className="filter-group">
            <select
              className="filter-dropdown"
              value={selectedMod || ''}
              onChange={(e) => setSelectedMod(e.target.value || null)}
            >
              <option value="">All Mods</option>
              {mods.map(mod => {
                const count = completedAdvancements.filter(a => a.modName === mod).length;
                return (
                  <option key={mod} value={mod}>
                    {mod} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Advancements list */}
      <div className="advancements-list">
        {filteredAdvancements.length === 0 ? (
          <div className="advancements-empty">
            <p>📭 No advancements match your search</p>
          </div>
        ) : (
          filteredAdvancements.map(advancement => (
            <div key={advancement.key} className="advancement-item">
              <div className="advancement-header" onClick={() => toggleExpanded(advancement.key)}>
                <div className="advancement-left">
                  <span className="advancement-emoji">{advancement.emoji}</span>
                  <div className="advancement-info">
                    <h3 className="advancement-title">{advancement.title}</h3>
                    <div className="advancement-meta">
                      <span className="advancement-category">{advancement.category}</span>
                      <span className="advancement-mod">{advancement.modName}</span>
                    </div>
                  </div>
                </div>
                <div className="advancement-right">
                  <span className="advancement-date">
                    {advancement.timestamp.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit',
                    })}
                  </span>
                  <span className={`expand-icon ${expandedAdvancements.has(advancement.key) ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {/* Expanded details */}
              {expandedAdvancements.has(advancement.key) && (
                <div className="advancement-details">
                  <div className="detail-row">
                    <strong>Key:</strong>
                    <code>{advancement.key}</code>
                  </div>
                  <div className="detail-row">
                    <strong>Completed:</strong>
                    <span>{advancement.timestamp.toLocaleString()}</span>
                  </div>
                  {Object.entries(advancement.criteria).length > 0 && (
                    <div className="detail-row">
                      <strong>Criteria:</strong>
                      <div className="criteria-list">
                        {Object.entries(advancement.criteria).map(([criterionName, criterionTime]) => (
                          <div key={criterionName} className="criterion">
                            <span className="criterion-name">{criterionName}</span>
                            <span className="criterion-time">{criterionTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdvancementsTab;
