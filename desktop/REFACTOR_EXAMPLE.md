# SaveAnalyticsPage Refactor - Before & After Example

This document shows how SaveAnalyticsPage was refactored to use the new shared components. Use this as a template for refactoring InstanceDetailView and other pages.

## Summary of Changes

✅ **Code Reduction**: ~100 lines of JSX simplified
✅ **Styling Consolidation**: Removed 300+ lines of duplicate CSS
✅ **Consistency**: Now uses shared components and styling
✅ **Maintainability**: Changes to headers/tabs/metadata automatically apply across all pages

---

## BEFORE: Original Implementation

### JSX Structure
```tsx
return (
  <div className="save-analytics-page">
    {/* Header */}
    <div className="save-analytics-header">
      <button className="save-analytics-back" onClick={onBack}>
        ← Back
      </button>
      <div className="save-analytics-title-section">
        <h1 className="save-analytics-title">{data.name}</h1>
        <p className="save-analytics-subtitle">
          {data.gameMode} • {data.gameVersion} • {formatPlaytime(data.playtime)} playtime
        </p>
      </div>
    </div>

    {/* Metadata Items */}
    <div className="save-analytics-info-bar">
      <div className="save-analytics-quick-stats">
        <div className="quick-stat">
          <span className="quick-stat-label">🎮 Mode</span>
          <span className="quick-stat-value">{data.gameMode.charAt(0).toUpperCase() + data.gameMode.slice(1)}</span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">📦 Version</span>
          <span className="quick-stat-value">{data.gameVersion}</span>
        </div>
        {/* ... 5 more items ... */}
      </div>

      {/* Player Controls */}
      <div className="save-analytics-player-controls">
        {/* Player selector and refresh button */}
      </div>
    </div>

    {/* Tabs */}
    <div className="save-analytics-tabs">
      <button
        className={`save-analytics-tab ${activeTab === 'progress' ? 'active' : ''}`}
        onClick={() => setActiveTab('progress')}
      >
        Progress
      </button>
      {/* ... 4 more tabs ... */}
    </div>

    {/* Content */}
    <div className="save-analytics-content">
      {/* Tab content here */}
    </div>
  </div>
);
```

### Import Statements
```tsx
import React, { useState, useEffect } from 'react';
import { PlayerData } from '../../scanner/player-parser';
import PlayerInfoTab from '../components/PlayerInfoTab';
import '../styles/SaveAnalyticsPage.css';
```

### CSS File Structure
- 600+ lines of CSS
- Duplicate styles for headers, metadata, tabs
- No shared variables or reusable patterns

---

## AFTER: Refactored Implementation

### JSX Structure
```tsx
// Define tabs configuration
const tabs = [
  { id: 'progress', label: 'Progress' },
  { id: 'playerStatus', label: 'Player Status' },
  { id: 'exploration', label: 'Exploration' },
  { id: 'stats', label: 'Statistics' },
  { id: 'inventory', label: 'Inventory' },
];

// Player controls (now goes in header as rightContent)
const playerControls = (
  <div className="save-analytics-player-controls">
    {playerUUIDs.length > 1 && (
      <div className="save-analytics-player-selector">
        <label htmlFor="main-player-select">👤 Player:</label>
        <select
          id="main-player-select"
          value={selectedPlayerUUID}
          onChange={(e) => setSelectedPlayerUUID(e.target.value)}
        >
          {playerUUIDs.map((uuid) => (
            <option key={uuid} value={uuid}>
              {playerNames[uuid] || uuid.substring(0, 8) + '...'}
            </option>
          ))}
        </select>
      </div>
    )}
    <button
      className="refresh-button"
      onClick={handleRefreshPlayerData}
      disabled={loadingPlayerData}
      title="Refresh player data from save file"
    >
      {loadingPlayerData ? '⟳ Refreshing...' : '⟳ Refresh'}
    </button>
  </div>
);

return (
  <PageContainer fullScreen>
    {/* Unified Header Component */}
    <PageHeader
      title={data.name}
      onBack={onBack}
      rightContent={playerControls}
    />

    {/* Unified Metadata Section */}
    <MetadataSection>
      <MetadataGrid>
        <MetadataItem label="🎮 Mode" value={data.gameMode.charAt(0).toUpperCase() + data.gameMode.slice(1)} />
        <MetadataItem label="📦 Version" value={data.gameVersion} />
        <MetadataItem label="⚙️ Difficulty" value={['Peaceful', 'Easy', 'Normal', 'Hard'][data.difficulty] || 'Unknown'} />
        <MetadataItem
          label="📋 Seed"
          value={data.seed.substring(0, 10) + '...'}
          isMonospace
          title={data.seed}
        />
        <MetadataItem label="📅 Created" value={new Date(data.createdAt).toLocaleDateString()} />
        <MetadataItem label="⏱️ Last Played" value={new Date(data.lastPlayed).toLocaleDateString()} />
        <MetadataItem label="🔧 Cheats" value={data.cheatsAllowed ? '✅' : '❌'} />
      </MetadataGrid>
    </MetadataSection>

    {/* Unified Tab Component */}
    <TabNavigation
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as TabType)}
    />

    {/* Unified Content Component */}
    <TabContent>
      {/* Tab content here - unchanged */}
    </TabContent>
  </PageContainer>
);
```

### Import Statements
```tsx
import React, { useState, useEffect } from 'react';
import { PlayerData } from '../../scanner/player-parser';
import PlayerInfoTab from '../components/PlayerInfoTab';
import {
  PageContainer,
  PageHeader,
  MetadataGrid,
  MetadataItem,
  MetadataSection,
  TabNavigation,
  TabContent,
  ContentSection,
} from '../components/shared';
import '../styles/SaveAnalyticsPage.css';
```

### CSS File Structure
- ~200 lines of CSS (reduced from 600+)
- Imports shared-layout.css at top
- Only page-specific styles remain
- Uses CSS variables from shared-layout.css
- Styles organized by component/feature

---

## Key Differences

### Code Organization

| Aspect | Before | After |
|--------|--------|-------|
| **Header JSX** | 12 lines | 1 component call |
| **Metadata JSX** | 28 lines | 7 MetadataItem calls |
| **Tabs JSX** | 30 lines | 1 TabNavigation call |
| **Total JSX** | ~100 lines | ~40 lines |
| **CSS Lines** | 600+ | ~200 |

### Component Reusability

**Before:**
- Header logic repeated in SaveAnalyticsPage, InstanceDetailView, Dashboard
- Metadata styling duplicated across pages
- Tab navigation code identical in multiple places

**After:**
- PageHeader used everywhere
- MetadataGrid/MetadataItem used everywhere
- TabNavigation used everywhere
- Single source of truth for styling

### Styling Benefits

**Before:**
```css
/* SaveAnalyticsPage.css - duplicating common styles */
.save-analytics-header { /* 20 lines */ }
.save-analytics-back { /* 20 lines */ }
.save-analytics-title { /* 10 lines */ }
.quick-stat { /* 15 lines */ }
.save-analytics-tabs { /* 25 lines */ }
.save-analytics-tab { /* 15 lines */ }
```

**After:**
```css
/* SaveAnalyticsPage.css - only page-specific styles */
.save-analytics-player-controls { /* styles */ }
.save-analytics-section { /* custom section styles */ }
.save-analytics-card { /* custom card styles */ }
```

All common header, metadata, and tab styles are in `shared-layout.css` and automatically apply.

---

## Pattern for Refactoring Other Pages

### Step 1: Add Imports
```tsx
import {
  PageContainer,
  PageHeader,
  MetadataGrid,
  MetadataItem,
  MetadataSection,
  TabNavigation,
  TabContent,
  ContentSection,
} from '../components/shared';
```

### Step 2: Replace Page Container
```tsx
// Before
<div className="your-page-name">

// After
<PageContainer fullScreen>
```

### Step 3: Replace Header
```tsx
// Before
<div className="your-header">
  <button onClick={onBack}>Back</button>
  <h1>{title}</h1>
</div>

// After
<PageHeader title={title} onBack={onBack} />
```

### Step 4: Replace Metadata
```tsx
// Before
<div className="your-metadata">
  <div className="item">
    <span className="label">Label</span>
    <span className="value">Value</span>
  </div>
</div>

// After
<MetadataSection>
  <MetadataGrid>
    <MetadataItem label="Label" value="Value" />
  </MetadataGrid>
</MetadataSection>
```

### Step 5: Replace Tabs
```tsx
// Before
<div className="your-tabs">
  <button className={activeTab === 'tab1' ? 'active' : ''} onClick={() => setActiveTab('tab1')}>Tab 1</button>
</div>

// After
<TabNavigation
  tabs={[{ id: 'tab1', label: 'Tab 1' }]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Step 6: Replace Content Wrapper
```tsx
// Before
<div className="your-content">

// After
<TabContent>
```

### Step 7: Update CSS
- Keep only page-specific styles
- Remove header, metadata, tab styles
- Import shared-layout.css at top
- Use CSS variables for consistency

---

## Results

✅ **Cleaner Code** - 60% less JSX
✅ **Reduced CSS** - 67% less CSS code
✅ **Consistency** - All pages look and behave the same
✅ **Maintainability** - Update shared styles once, affects all pages
✅ **Scalability** - Easy to add new pages with consistent styling
✅ **Easier Theming** - Change colors via CSS variables
✅ **Built-in Responsive Design** - No additional work needed

---

## Next Steps

Ready to refactor the remaining pages? Use the pattern above:

1. **InstanceDetailView.tsx** - Similar structure, slightly different metadata
2. **DashboardPage.tsx** - Uses shared header patterns
3. **Other pages as needed** - MetricsPage, etc.

All refactoring follows the same 7-step pattern shown above.
