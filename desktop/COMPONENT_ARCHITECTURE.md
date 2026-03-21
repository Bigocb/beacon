# Shared Component Architecture Guide

## Overview

The application now uses a shared component architecture with reusable UI components and centralized styling. This ensures consistency across all pages (Dashboard, SaveAnalyticsPage, InstanceDetailView) and makes maintenance easier.

## Created Files

### Shared Styling
- **`src/renderer/styles/shared-layout.css`** - Central CSS file with:
  - CSS variables for colors, spacing, sizing
  - Base component styles (headers, metadata, tabs, content)
  - Responsive design utilities
  - All pages import this file

### Shared Components
Located in `src/renderer/components/shared/`:

1. **PageHeader.tsx**
   - Back button, title, optional subtitle
   - Optional right-side content (buttons, controls)

2. **PageContainer.tsx**
   - Main page wrapper with flex layout
   - `PageContainer` - Main wrapper
   - `ContentSection` - Content section with optional title

3. **MetadataGrid.tsx**
   - `MetadataSection` - Container for metadata
   - `MetadataGrid` - Flexbox grid for metadata items
   - `MetadataItem` - Individual metadata item (label + value)
   - Supports clickable items and monospace values

4. **TabNavigation.tsx**
   - `TabNavigation` - Tab button bar
   - `TabContent` - Content wrapper for tab content
   - Handles active state management

5. **index.ts** - Exports all shared components for easy importing

## CSS Variables (shared-layout.css)

### Color Palette
```css
--color-primary: #3b82f6;
--color-success: #4ade80;
--color-danger: #ef4444;
--color-bg-primary: #0f172a;
--color-bg-secondary: #1e293b;
--color-text-primary: #ffffff;
--color-text-secondary: #e2e8f0;
--color-text-muted: #94a3b8;
--color-border-light: rgba(148, 163, 184, 0.15);
```

### Spacing
```css
--spacing-xs: 4px;     /* Small padding/gaps */
--spacing-sm: 8px;     /* Small elements */
--spacing-md: 12px;    /* Standard padding */
--spacing-lg: 16px;    /* Regular padding */
--spacing-xl: 20px;    /* Large gaps */
--spacing-2xl: 24px;   /* Extra large */
--spacing-3xl: 32px;   /* Page padding */
```

## Usage Examples

### Example 1: Basic Page Layout

```tsx
import { PageContainer, PageHeader, MetadataGrid, MetadataItem, TabNavigation, TabContent } from '../components/shared';

export const MyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'details', label: 'Details' },
  ];

  return (
    <PageContainer fullScreen>
      <PageHeader
        title="My Page Title"
        subtitle="Optional subtitle"
        onBack={() => goBack()}
      />

      <MetadataSection>
        <MetadataGrid>
          <MetadataItem label="Mode" value="Creative" />
          <MetadataItem label="Version" value="1.20.1" />
          <MetadataItem label="Difficulty" value="Normal" />
        </MetadataGrid>
      </MetadataSection>

      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <TabContent>
        {activeTab === 'overview' && <OverviewContent />}
        {activeTab === 'details' && <DetailsContent />}
      </TabContent>
    </PageContainer>
  );
};
```

### Example 2: Using MetadataItem with Click Handlers

```tsx
<MetadataItem
  label="Players"
  value="5"
  isClickable={true}
  onClick={() => showPlayerDialog()}
/>
```

### Example 3: Monospace Values (for seeds, IDs, etc.)

```tsx
<MetadataItem
  label="Seed"
  value="809341922..."
  isMonospace={true}
/>
```

## Migrating Pages to Use Shared Components

### Step 1: Import Shared Components
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

### Step 2: Replace Page Structure
**Before:**
```tsx
<div className="my-custom-page">
  <div className="my-custom-header">
    <button onClick={onBack}>Back</button>
    <h1>Title</h1>
  </div>
  <div className="my-custom-metadata">
    <div className="metadata-item">...</div>
  </div>
</div>
```

**After:**
```tsx
<PageContainer>
  <PageHeader title="Title" onBack={onBack} />
  <MetadataSection>
    <MetadataGrid>
      <MetadataItem label="Label" value="Value" />
    </MetadataGrid>
  </MetadataSection>
</PageContainer>
```

### Step 3: Update CSS
1. Remove duplicate header, metadata, tab styles
2. Keep only page-specific customizations
3. Import shared-layout.css at the top
4. Use CSS variables for consistent styling

## Page-Specific Customizations

Each page can still have custom CSS. The hierarchy is:

1. **shared-layout.css** - Base styles (imported by all)
2. **PageName.css** - Page-specific overrides and additions

Example of page-specific customization:
```css
/* SaveAnalyticsPage.css */
@import 'shared-layout.css';

/* Custom override for this page */
.save-analytics-page .metadata-item {
  min-width: 160px; /* Slightly wider than default */
}

/* Page-specific elements */
.save-analytics-custom-widget {
  /* Custom styling */
}
```

## Responsive Design

Shared components include responsive breakpoints:
- **Desktop (1024px+)** - Full layout
- **Tablet (768px-1024px)** - Adjusted spacing
- **Mobile (<768px)** - Compact layout

No additional code needed - responsive behavior is built-in!

## Benefits

✅ **Consistency** - All pages use the same components and styling
✅ **Maintainability** - Changes in shared-layout.css update all pages
✅ **Reusability** - Components can be used in new pages
✅ **Reduced Code Duplication** - No need to repeat header/tab/metadata code
✅ **Easier Theming** - Change colors by updating CSS variables
✅ **Responsive by Default** - All components include responsive design

## Next Steps

1. **Refactor SaveAnalyticsPage** to use shared components
2. **Refactor InstanceDetailView** to use shared components
3. **Create additional shared components** as needed (forms, dialogs, cards, etc.)
4. **Update Dashboard** to use shared header patterns
5. **Add theme support** using CSS variables

## Component API Reference

### PageHeader
```tsx
<PageHeader
  title: string              // Required
  subtitle?: string          // Optional
  onBack: () => void        // Required
  rightContent?: React.ReactNode  // Optional
/>
```

### MetadataItem
```tsx
<MetadataItem
  label: string              // Required
  value: React.ReactNode     // Required
  isMonospace?: boolean      // Default: false
  isClickable?: boolean      // Default: false
  onClick?: () => void       // Optional
/>
```

### TabNavigation
```tsx
<TabNavigation
  tabs: TabItem[]            // Array of { id, label, icon? }
  activeTab: string          // Current active tab ID
  onTabChange: (id: string) => void  // Tab change handler
  className?: string         // Optional CSS class
/>
```

### PageContainer
```tsx
<PageContainer
  fullScreen?: boolean       // Default: false
  className?: string         // Optional CSS class
>
  {children}
</PageContainer>
```

### MetadataGrid
```tsx
<MetadataGrid className?: string>
  {children}  // MetadataItem components
</MetadataGrid>
```

### ContentSection
```tsx
<ContentSection
  title?: string             // Optional section title
  className?: string         // Optional CSS class
>
  {children}
</ContentSection>
```
