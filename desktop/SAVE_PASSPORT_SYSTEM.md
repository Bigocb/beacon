# Save Passport System

## Overview

The **Save Passport** system provides a comprehensive, multi-layered view of Minecraft save data. Users can view save statistics at three levels:

1. **Passport Card** - Quick summary on dashboard/list views
2. **Analytics Page** - Detailed breakdown by category
3. **Aggregated Stats** - Instance-level and global-level rollups (future)

## Architecture

### Components

#### 1. SavePassportCard (`components/saves/SavePassportCard.tsx`)
Compact card showing key save metrics:
- **Core Identity**: Name, game mode, difficulty, seed
- **Timeline**: Playtime, last played, creation date
- **Progress Bars**: Advancements %, exploration %
- **Quick Stats**: Mobs killed, deaths, blocks mined
- **Spawn Location**: Quick reference coords

**Props:**
```typescript
interface SavePassportCardProps {
  save: SaveData;
  onClick?: () => void;
  onDelete?: () => void;
}
```

**Use Cases:**
- Dashboard instance cards
- Save lists with search/filter
- Collections/favorites
- Comparison sidebars

---

#### 2. SaveAnalyticsPage (`pages/SaveAnalyticsPage.tsx`)
Full-page detailed view organized by tabs:

| Tab | Content |
|-----|---------|
| **Identity** | Core info, timeline, configuration |
| **Progress** | Advancements %, recipes, discoveries |
| **Location** | Spawn, current location, last death, dimensions visited |
| **Statistics** | Movement, building, combat, survival stats |
| **Inventory** | Armor, inventory items, ender chest |
| **World** | Weather, time, health, effects |

**Features:**
- Tabbed navigation for organization
- Responsive grid layout
- Formatted numbers and coordinates
- Progress bars for completion %
- Scrollable content area
- Back button to return to list

---

### Data Flow

```
Minecraft Save Directory
    ↓
saveDataExtractor.ts (utility functions)
    ├─ extractWorldData() → level.dat (NBT)
    ├─ extractPlayerData() → playerdata/{uuid}.dat (NBT)
    ├─ extractAdvancementData() → advancements/{uuid}.json
    ├─ extractStatisticsData() → stats/{uuid}.json
    └─ extractFullSaveData() → Combined SaveAnalyticsData
         ↓
SaveAnalyticsData interface
         ↓
    ┌────────────────────────────────┐
    │ Components receive typed data   │
    ├─────────────┬──────────────────┤
    │ SaveCard    │ SaveAnalyticsPage│
    └─────────────┴──────────────────┘
         ↓
    User Interface
```

### Data Categories

#### Core Save Identity
- **Save name**: User-friendly display name
- **Game mode**: Survival, Creative, Adventure, Spectator, Hardcore
- **Difficulty**: Peaceful (0) to Hard (3)
- **Game version**: 1.20.1, etc.
- **Seed**: World seed (shareable)
- **Creation date**: When save was created
- **Last played**: Most recent play session

#### Playtime & Activity
- **Total playtime**: Formatted as "127h 45m"
- **Last played**: Relative (3 days ago)
- **Play sessions**: (future tracking)
- **In-game time**: Day/night cycle counter

#### Progress & Completion
- **Advancements**: X/Y completed (%)
- **Advancement categories**: Exploration %, combat %, etc. (future)
- **Recipes unlocked**: Total count
- **Structures discovered**: Named list
- **Dimensions visited**: Overworld, Nether, End, custom

#### Location & Navigation
- **Spawn point**: X, Y, Z coordinates
- **Current location**: Player's current position
- **Last death**: Where player died (if applicable)
- **World explored**: Percentage of chunks loaded
- **Named locations**: Waypoints/bases (future)

#### Player Data
- **Inventory**: Items with counts and enchantments
- **Armor**: Currently equipped gear with enchantments
- **Ender chest**: Stored items
- **Health**: Current ❤ (0-20)
- **Hunger**: Current 🍗 (0-10)
- **Experience**: Level and XP points
- **Effects**: Active potion effects

#### Statistics & Metrics
- **Movement**: Distance (blocks), jumps, swims
- **Building**: Blocks mined, placed, items crafted
- **Combat**: Mobs killed, deaths, damage taken
- **Survival**: Food eaten, beds slept in

#### World State
- **Weather**: Clear, raining, thundering
- **Time of day**: In-game ticks
- **Moon phase**: 0-7
- **Game rules**: PvP, fire spread, mob spawning
- **Cheats enabled**: Yes/No
- **Difficulty locked**: Yes/No

#### Mod-Specific Data (Future)
- Mod progression milestones
- Mod-added dimensions
- Custom mod data

---

## Future: Aggregation at Instance Level

### Instance Passport Concept

Aggregate save data to show instance-level metrics:

```typescript
interface InstancePassport {
  // Instance Identity
  name: string;
  version: string;
  modLoader: string;

  // Aggregated Stats
  totalPlaytime: number; // Sum of all saves
  saveCount: number;
  totalAdvancementsPercent: number; // Average across saves

  // Combined Progress
  combinedStructuresFound: Set<string>;
  dimensionsVisited: Set<string>;

  // Top Save
  mostPlayedSave: SaveAnalyticsData;
  recentlyPlayed: SaveAnalyticsData[];

  // Statistics
  averageDifficulty: number;
  survivalVsCreativeRatio: number;
  totalMobsKilled: number; // Sum
  totalDeaths: number; // Sum
}
```

**Display Options:**
- Compare saves within instance
- Track aggregate progress
- Identify most-played saves
- Difficulty/game mode distribution

---

## Future: Global Aggregation

Aggregate across all instances:

```typescript
interface GlobalMetrics {
  totalInstances: number;
  totalSaves: number;
  combinedPlaytime: number;

  // By version
  instancesByVersion: Map<string, number>;

  // By mod loader
  instancesByLoader: Map<string, number>;

  // Achievements
  totalAdvancementsPercent: number;
  allStructuresFound: Set<string>;
  allDimensionsVisited: Set<string>;

  // Extreme stats
  mostPlayedSave: SaveAnalyticsData;
  highestDeathCount: number;
  mostStructuresFound: number;
}
```

**Dashboard Features:**
- Global stats widget
- "Across all instances" metrics
- Comparison charts
- Trending saves

---

## Implementation Notes

### NBT Parsing

The `saveDataExtractor.ts` includes placeholders for NBT parsing. For production:

```bash
npm install prismarine-nbt
# or
npm install minecraft-nbt
```

Then update `extractWorldData()` and `extractPlayerData()` to use the library.

### Data Format Mapping

**Game Modes:**
```
0 = Survival
1 = Creative
2 = Adventure
3 = Spectator
```

**Difficulty:**
```
0 = Peaceful
1 = Easy
2 = Normal
3 = Hard
```

**Colors (CSS):**
```
Survival:  #16a34a (green)
Creative:  #3b82f6 (blue)
Adventure: #f59e0b (orange)
Spectator: #8b5cf6 (purple)
Hardcore:  #dc2626 (red)
```

### Performance Optimization

For large saves with thousands of items:
- **Pagination**: Show first 20 items, indicate overflow
- **Lazy loading**: Load inventory details on-demand
- **Caching**: Cache extracted data per save
- **Workers**: Use Web Workers for heavy parsing

---

## UI Flows

### Card → Detail Navigation
```
Dashboard / List View
    ↓ (click card)
SaveAnalyticsPage
    ↓ (click back)
Dashboard / List View
```

### Confirmation Dialog Integration
```
SavePassportCard
    ↓ (click delete ×)
ConfirmDialog (red/dangerous)
    ├─ Cancel → SavePassportCard
    └─ Confirm → Delete + API call
```

---

## Integration Checklist

- [ ] IPC handler for loading save data: `save:loadAnalytics`
- [ ] Main process file system access to read save directories
- [ ] Router integration to navigate to SaveAnalyticsPage
- [ ] SavePassportCard integrated into SavesByInstance component
- [ ] Delete confirmation dialog with useBulkDelete hook
- [ ] Lazy loading for large inventory lists
- [ ] Stats formatting utilities (formatPlaytime, formatNumber, etc.)
- [ ] CSS custom properties for colors (game mode, difficulty)

---

## Future Enhancements

### Phase 2
- [ ] Instance-level aggregation and passport
- [ ] Global metrics dashboard
- [ ] Save comparison tool (side-by-side)
- [ ] Export save data as JSON/CSV

### Phase 3
- [ ] Historical tracking (playtime over time)
- [ ] Achievement notifications
- [ ] Multiplayer data aggregation
- [ ] Backup/restore utilities

### Phase 4
- [ ] Custom metric definitions
- [ ] Save tagging and favorites
- [ ] Smart recommendations ("play this save next")
- [ ] Community leaderboards (opt-in)

---

## File Structure

```
src/
├── components/
│   ├── saves/
│   │   ├── SavePassportCard.tsx
│   │   └── SavePassportCard.css
│   └── ConfirmDialog.tsx
│   └── ConfirmDialog.css
├── pages/
│   ├── SaveAnalyticsPage.tsx
│   └── SaveAnalyticsPage.css
├── utils/
│   └── saveDataExtractor.ts
├── hooks/
│   └── useConfirmDialog.ts
└── types/
    └── saves.ts (SaveAnalyticsData interface)
```

---

## Testing

### Mock Data
For development, use mock SaveAnalyticsData:

```typescript
const mockSave: SaveAnalyticsData = {
  id: 'test-save',
  name: 'My Adventure',
  folderName: 'My Adventure',
  gameMode: 'survival',
  difficulty: 2,
  gameVersion: '1.20.1',
  seed: '12345',
  playtime: 450000, // seconds
  advancementsCompleted: 42,
  advancementsTotal: 50,
  explored: 73,
  // ... rest of data
};
```

### Component Testing
```typescript
test('SavePassportCard displays correct playtime', () => {
  render(<SavePassportCard save={mockSave} />);
  expect(screen.getByText('125h 0m')).toBeInTheDocument();
});
```

---

## Performance Targets

- Card render: < 50ms
- Analytics page navigation: < 100ms
- Data extraction from disk: < 1s per save
- Large inventory rendering: < 200ms (with virtualization)

---

