import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlayerData } from '../../scanner/player-parser';
import PlayerInfoTab from '../components/PlayerInfoTab';
import { NoteList, NoteEditor, Timeline, WorldMetadataEditor, AdvancementsTab } from '../components/shared';
import { NoteUI, TagUI, WorldMetadataUI } from '../types/enrichment';
import * as notesService from '../services/notesService';
import * as metadataService from '../services/metadataService';
import * as timelineService from '../services/timelineService';
import type { TimelineEvent } from '../components/Timeline';
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

interface SaveAnalyticsData {
  id: string;
  name: string;
  folderName: string;
  createdAt: number;
  lastPlayed: number;
  playtime: number;
  gameMode: 'survival' | 'creative' | 'adventure' | 'spectator' | 'hardcore';
  difficulty: number;
  seed: string;

  // Core Identity
  gameVersion: string;
  datapacks: string[];

  // Location & Navigation
  spawnX: number;
  spawnY: number;
  spawnZ: number;
  playerX: number;
  playerY: number;
  playerZ: number;
  lastDeathX?: number;
  lastDeathY?: number;
  lastDeathZ?: number;
  explored: number;
  dimensionsVisited: string[];

  // Progress & Completion
  advancementsCompleted: number;
  advancementsTotal: number;
  recipesUnlocked: number;
  structuresDiscovered: string[];

  // Player Inventory
  inventoryItems: Array<{ name: string; count: number; enchantments?: string[] }>;
  armor: Array<{ slot: string; item: string; enchantments?: string[] }>;
  enderChestItems: Array<{ name: string; count: number }>;

  // Statistics & Metrics
  totalDistance: number;
  blocksMined: number;
  blocksPlaced: number;
  itemsCrafted: number;
  mobsKilled: number;
  deaths: number;
  damageTaken: number;
  foodEaten: number;
  bedsSleptIn: number;
  jumps: number;
  swims: number;

  // World State
  weather: 'clear' | 'raining' | 'thundering';
  timeOfDay: number;
  moonPhase: number;
  cheatsAllowed: boolean;
  difficultyLocked: boolean;

  // Player Status
  health: number;
  hunger: number;
  xp: number;
  level: number;
  effects: string[];
}

type TabType = 'progress' | 'playerStatus' | 'exploration' | 'stats' | 'inventory' | 'notes' | 'timeline' | 'advancements';

interface SaveAnalyticsPageProps {
  saveData: SaveAnalyticsData | any; // Accept any format, will use optional chaining
  onBack: () => void;
}

const formatNumber = (num: number): string => num.toLocaleString();

const formatPlaytime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatCoords = (x: number, y: number, z: number): string => {
  return `${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)}`;
};

const getStructureIcon = (structureName: string): string => {
  const icons: Record<string, string> = {
    'village': '🏘️',
    'desert_pyramid': '🔺',
    'jungle_pyramid': '🌿',
    'ocean_ruin': '🏛️',
    'stronghold': '🏰',
    'mansion': '🏛️',
    'mineshaft': '⛏️',
    'nether_fortress': '🔥',
    'bastion_remnant': '⚔️',
    'end_city': '👑',
    'igloo': '❄️',
    'shipwreck': '⚓',
    'witch_hut': '🧙',
    'swamp_hut': '🌳',
    'monument': '💎',
    'ocean_monument': '🌊',
    'pillager_outpost': '🏹',
    'buried_treasure': '💰',
  };
  return icons[structureName.toLowerCase()] || '🏗️';
};

/**
 * Generate timeline events from advancement, exploration, and statistics data
 * These are automatically extracted from the save file
 */
const generateGameProgressEvents = (
  advancementData: any,
  explorationData: any,
  statisticsData: any
): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const now = new Date();

  console.log('🔍 [Timeline] Generating game progress events...');
  console.log('📊 [Timeline] advancementData:', advancementData);
  console.log('🌍 [Timeline] explorationData:', explorationData);
  console.log('📈 [Timeline] statisticsData:', statisticsData);

  // Create major milestone events based on advancement progress
  if (advancementData?.advancements) {
    const advancements = advancementData.advancements;
    console.log('🎯 [Timeline] Found advancements object with', Object.keys(advancements).length, 'keys');

    // Filter advancements by category (Story, Adventure, Husbandry, End)
    const selectedAdvancements = Object.entries(advancements).filter(([key, _]) => {
      const isStory = key.includes('minecraft:story/');
      const isAdventure = key.includes('minecraft:adventure/');
      const isHusbandry = key.includes('minecraft:husbandry/');
      const isEnd = key.includes('minecraft:end/');
      return isStory || isAdventure || isHusbandry || isEnd;
    });

    console.log(`🎯 [Timeline] Filtered ${selectedAdvancements.length} advancements from selected categories (Story, Adventure, Husbandry, End)`);

    selectedAdvancements.forEach(([key, advancement]) => {
      const advancementData = advancement as any;
      if (advancementData.done) {
        // Extract category emoji
        const categoryEmoji = key.includes('minecraft:story/') ? '📖' :
                             key.includes('minecraft:adventure/') ? '🗺️' :
                             key.includes('minecraft:husbandry/') ? '🐕' :
                             key.includes('minecraft:end/') ? '👑' : '🏆';

        // Format title
        const title = key.split('/').pop()?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || key;

        console.log(`✅ [Timeline] Found advancement: ${key}`);

        // Extract timestamp from criteria object
        let timestamp = new Date(now.getTime() - Math.random() * 86400000 * 30); // fallback

        if (advancementData.criteria && typeof advancementData.criteria === 'object') {
          const criteriaTimestamps = Object.values(advancementData.criteria).filter(v => typeof v === 'string');
          if (criteriaTimestamps.length > 0) {
            const firstTimestamp = criteriaTimestamps[0] as string;
            console.log(`⏰ [Timeline] Criteria timestamp: ${firstTimestamp}`);
            const parsedDate = new Date(firstTimestamp);
            if (!isNaN(parsedDate.getTime())) {
              timestamp = parsedDate;
              console.log(`✅ [Timeline] Parsed timestamp: ${timestamp}`);
            }
          }
        }

        events.push({
          id: `achievement_${key}`,
          timestamp: timestamp,
          title: `${categoryEmoji} ${title}`,
          description: 'Advancement unlocked',
          type: 'achievement',
          emoji: categoryEmoji,
          color: '#10b981',
          metadata: {
            achieved: true,
          },
        });
      }
    });

    console.log(`✅ [Timeline] Added ${selectedAdvancements.filter(([_, a]) => (a as any).done).length} advancement events to timeline`);
  } else {
    console.log('⚠️ [Timeline] No advancements data available');
  }

  // Add structure discovery events
  if (explorationData?.structuresDiscovered && Array.isArray(explorationData.structuresDiscovered)) {
    console.log('🏛️ [Timeline] Structures discovered:', explorationData.structuresDiscovered);
    explorationData.structuresDiscovered.forEach((structure: string) => {
      events.push({
        id: `structure_${structure}`,
        timestamp: new Date(now.getTime() - Math.random() * 86400000 * 30), // Random within last 30 days
        title: `Discovered ${structure.replace(/_/g, ' ')}`,
        type: 'achievement',
        emoji: getStructureIcon(structure),
        color: '#8b5cf6',
        metadata: {
          achieved: true,
        },
      });
    });
  } else {
    console.log('⚠️ [Timeline] No structures discovered data');
  }

  // Add dimension visit events
  if (explorationData?.dimensionsVisited && Array.isArray(explorationData.dimensionsVisited)) {
    console.log('🌌 [Timeline] Dimensions visited:', explorationData.dimensionsVisited);
    explorationData.dimensionsVisited.forEach((dimension: string) => {
      const dimensionEmojis: Record<string, string> = {
        'overworld': '🌍',
        'nether': '🔥',
        'end': '👑',
        'minecraft:overworld': '🌍',
        'minecraft:the_nether': '🔥',
        'minecraft:the_end': '👑',
      };

      const emoji = dimensionEmojis[dimension.toLowerCase()] || '🌌';

      events.push({
        id: `dimension_${dimension}`,
        timestamp: new Date(now.getTime() - Math.random() * 86400000 * 30),
        title: `Visited ${dimension.replace(/minecraft:|_/g, ' ').trim()}`,
        type: 'achievement',
        emoji: emoji,
        color: '#f59e0b',
        metadata: {
          achieved: true,
        },
      });
    });
  } else {
    console.log('⚠️ [Timeline] No dimensions visited data');
  }

  // Add first play event
  events.push({
    id: 'first_play',
    timestamp: new Date(now.getTime() - Math.random() * 86400000 * 365), // Random within last year
    title: 'World Created',
    description: 'Started a new world',
    type: 'first_play',
    emoji: '🎮',
    color: '#3b82f6',
  });

  console.log(`✅ [Timeline] Generated ${events.length} game progress events`);
  console.log('📅 [Timeline] Events:', events);

  return events;
};

export const SaveAnalyticsPage: React.FC<SaveAnalyticsPageProps> = ({ saveData, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);

  // Real player data from NBT files
  const [playerUUIDs, setPlayerUUIDs] = useState<string[]>([]);
  const [selectedPlayerUUID, setSelectedPlayerUUID] = useState<string>('');
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingPlayerData, setLoadingPlayerData] = useState(false);

  // Progress data from save files
  const [advancementData, setAdvancementData] = useState<any>(null);
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [explorationData, setExplorationData] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingExploration, setLoadingExploration] = useState(false);

  // Notes & Tags
  const [notes, setNotes] = useState<NoteUI[]>([]);
  const [tags, setTags] = useState<TagUI[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteUI | null>(null);

  // World Metadata
  const [metadata, setMetadata] = useState<WorldMetadataUI | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(false);

  // Timeline
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Extract players from save data
  const players = saveData?.players || [];
  const playerCount = saveData?.player_count || players.length || 1;

  // Load player list from save directory
  useEffect(() => {
    const loadPlayers = async () => {
      const savePath = saveData?.file_path || saveData?.path;
      console.log('🎮 Loading players - savePath:', savePath);

      if (!savePath) {
        console.warn('❌ No save path available. Available keys:', Object.keys(saveData || {}));
        return;
      }

      setLoadingPlayers(true);
      try {
        const api = (window as any).api;
        const result = await api?.player?.getPlayerList(savePath);
        const uuids = result?.data || [];
        console.log('✅ Found players:', uuids);
        setPlayerUUIDs(uuids);
        if (uuids.length > 0) {
          setSelectedPlayerUUID(uuids[0]);
        }
      } catch (error) {
        console.error('❌ Error loading players:', error);
      } finally {
        setLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, [saveData?.file_path]);

  // Fetch player usernames from backend via IPC (avoids CORS issues)
  useEffect(() => {
    const fetchPlayerNames = async () => {
      if (playerUUIDs.length === 0) return;

      const newNames: Record<string, string> = {};
      const validUUIDs: string[] = [];

      for (const uuid of playerUUIDs) {
        // Check if we already have this name cached
        if (playerNames[uuid]) {
          newNames[uuid] = playerNames[uuid];
          validUUIDs.push(uuid);
          continue;
        }

        try {
          // Fetch player name from backend IPC handler
          const result = await window.api.players.getPlayerName(uuid);

          if (result.success && result.name) {
            newNames[uuid] = result.name;
            validUUIDs.push(uuid);
            console.log(`✅ Found player name: ${result.name} for UUID: ${uuid}`);
          } else {
            console.warn(`⚠️ Could not fetch name for UUID ${uuid} - removing from list`);
            // Don't add to validUUIDs - effectively removing this player
          }
        } catch (error: any) {
          console.warn(`⚠️ Error fetching name for UUID ${uuid}:`, error.message || error);
          console.log(`🗑️ Removing invalid player: ${uuid}`);
          // Don't add to validUUIDs - effectively removing this player
        }
      }

      setPlayerNames(newNames);

      // If we filtered out any players, update the list
      if (validUUIDs.length < playerUUIDs.length) {
        console.log(`🗑️ Filtered player list from ${playerUUIDs.length} to ${validUUIDs.length} valid players`);
        setPlayerUUIDs(validUUIDs);

        // If current selected player was removed, select the first valid one
        if (validUUIDs.length > 0 && !validUUIDs.includes(selectedPlayerUUID)) {
          setSelectedPlayerUUID(validUUIDs[0]);
        }
      }
    };

    fetchPlayerNames();
  }, [playerUUIDs]);

  // Load player data when UUID changes
  useEffect(() => {
    const loadPlayerData = async () => {
      const savePath = saveData?.file_path || saveData?.path;
      // Skip if prerequisites not met
      if (!selectedPlayerUUID || !savePath) {
        return;
      }
      console.log(`🎮 LoadPlayerData - UUID: ${selectedPlayerUUID}, Path: ${savePath}`);

      setLoadingPlayerData(true);
      try {
        const api = (window as any).api;
        console.log('📡 Calling api.player.extractPlayerData...');
        const result = await api?.player?.extractPlayerData(savePath, selectedPlayerUUID);
        console.log('📦 Result from IPC:', result);
        const data = result?.data || null;
        console.log('🎮 Setting playerData:', data);
        setPlayerData(data);
      } catch (error) {
        console.error('❌ Error loading player data:', error);
        setPlayerData(null);
      } finally {
        setLoadingPlayerData(false);
      }
    };

    loadPlayerData();
  }, [selectedPlayerUUID, saveData?.file_path]);

  // Load progress data (advancements and statistics) when needed
  useEffect(() => {
    const loadProgressData = async () => {
      const savePath = saveData?.file_path || saveData?.path;
      // Skip if prerequisites not met or tab is not one that needs this data
      if (!selectedPlayerUUID || !savePath || (activeTab !== 'progress' && activeTab !== 'advancements' && activeTab !== 'timeline')) {
        return;
      }
      console.log(`📊 loadProgressData - UUID: ${selectedPlayerUUID}, activeTab: ${activeTab}, savePath: ${savePath}`);

      setLoadingProgress(true);
      try {
        const api = (window as any).api;

        // Load advancements
        console.log('📥 Fetching advancements...');
        const advResult = await api?.progress?.extractAdvancements(savePath, selectedPlayerUUID);
        console.log('📤 Advancements result:', advResult);
        if (advResult?.data) {
          console.log('✅ Setting advancement data:', advResult.data);
          setAdvancementData(advResult.data);
        }

        // Load statistics
        console.log('📥 Fetching statistics...');
        const statResult = await api?.progress?.extractStatistics(savePath, selectedPlayerUUID);
        console.log('📤 Statistics result:', statResult);
        if (statResult?.data) {
          console.log('✅ Setting statistics data:', statResult.data);
          setStatisticsData(statResult.data);
        } else {
          console.warn('⚠️ No statistics data returned:', statResult);
        }
      } catch (error) {
        console.error('❌ Error loading progress data:', error);
      } finally {
        setLoadingProgress(false);
      }
    };

    loadProgressData();
  }, [selectedPlayerUUID, saveData?.file_path, activeTab]);

  // Load statistics data when stats tab is active
  useEffect(() => {
    const loadStatsData = async () => {
      const savePath = saveData?.file_path || saveData?.path;
      if (!selectedPlayerUUID || !savePath || activeTab !== 'stats') {
        return;
      }

      setLoadingStats(true);
      try {
        const api = (window as any).api;
        const statResult = await api?.progress?.extractStatistics(savePath, selectedPlayerUUID);
        if (statResult?.data) {
          setStatisticsData(statResult.data);
        }
      } catch (error) {
        console.error('❌ Error loading statistics data:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStatsData();
  }, [selectedPlayerUUID, saveData?.file_path, activeTab]);

  // Load exploration data when exploration or timeline tab is active
  useEffect(() => {
    const loadExplorationData = async () => {
      const savePath = saveData?.file_path || saveData?.path;
      if (!savePath || (activeTab !== 'exploration' && activeTab !== 'timeline')) {
        return;
      }

      setLoadingExploration(true);
      try {
        const api = (window as any).api;
        // Load exploration data (dimensions, structures, exploration percentage)
        if (selectedPlayerUUID) {
          console.log(`📡 Loading exploration data for UUID: ${selectedPlayerUUID}`);
          const exploResult = await api?.exploration?.extractExploration(savePath, selectedPlayerUUID);
          console.log('📊 Exploration result:', exploResult);

          if (exploResult?.data) {
            setExplorationData(exploResult.data);
            console.log('✅ Exploration data loaded:', exploResult.data);
          } else {
            console.warn('⚠️ No exploration data returned');
          }
        }
      } catch (error) {
        console.error('❌ Error loading exploration data:', error);
      } finally {
        setLoadingExploration(false);
      }
    };

    loadExplorationData();
  }, [selectedPlayerUUID, saveData?.file_path, activeTab]);

  // Reload notes from server (filtered by selected player)
  const reloadNotes = async () => {
    if (!saveData?.id) return;
    try {
      const [notesData, tagsData] = await Promise.all([
        notesService.fetchNotes(saveData.id, selectedPlayerUUID),
        notesService.fetchTags(),
      ]);
      setNotes(notesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Error reloading notes:', error);
    }
  };

  // Load notes and tags (filtered by selected player)
  useEffect(() => {
    const loadNotesAndTags = async () => {
      if (!saveData?.id || activeTab !== 'notes') return;

      setLoadingNotes(true);
      try {
        await reloadNotes();
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setLoadingNotes(false);
      }
    };

    loadNotesAndTags();
  }, [saveData?.id, activeTab, selectedPlayerUUID]);

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      if (!saveData?.id) return;

      setLoadingMetadata(true);
      try {
        console.log('🌍 [Frontend] Loading metadata for saveId:', saveData.id);
        const data = await metadataService.fetchMetadata(saveData.id);
        console.log('✅ [Frontend] Metadata loaded:', data);
        setMetadata(data);
      } catch (error) {
        console.error('❌ [Frontend] Error loading metadata:', error);
        // Initialize with defaults if fetch fails
        setMetadata({
          description: '',
          is_favorite: false,
          theme_color: '#64748b',
          world_type: 'survival',
          modpack_name: '',
          modpack_version: '',
          project_id: undefined,
          archived: false,
        });
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadMetadata();
  }, [saveData?.id]);

  // Load timeline events (filtered by selected player)
  useEffect(() => {
    const loadTimeline = async () => {
      if (!saveData?.id || activeTab !== 'timeline') return;

      setLoadingTimeline(true);
      try {
        console.log('📅 [Frontend] Loading timeline for saveId:', saveData.id, 'player:', selectedPlayerUUID);

        // Fetch database events (notes + milestones) filtered by player
        const dbEvents = await timelineService.fetchTimelineEvents(saveData.id, selectedPlayerUUID);
        console.log('✅ [Frontend] DB events loaded:', dbEvents.length);

        // Generate game progress events from advancements, exploration, and statistics
        const gameEvents = generateGameProgressEvents(advancementData, explorationData, statisticsData);
        console.log('✅ [Frontend] Game progress events generated:', gameEvents.length);

        // Combine and sort all events
        const allEvents = [...dbEvents, ...gameEvents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        console.log('✅ [Frontend] Total timeline events:', allEvents.length);
        setTimelineEvents(allEvents);
      } catch (error) {
        console.error('❌ [Frontend] Error loading timeline:', error);
        setTimelineEvents([]);
      } finally {
        setLoadingTimeline(false);
      }
    };

    loadTimeline();
  }, [saveData?.id, activeTab, selectedPlayerUUID, advancementData, explorationData, statisticsData]);

  // Handle note creation (associated with selected player)
  const handleCreateNote = async (noteData: Omit<NoteUI, 'id'>) => {
    try {
      console.log('📝 [Frontend] Creating note for saveId:', saveData.id, 'player:', selectedPlayerUUID);
      const result = await notesService.createNote(
        saveData.id,
        {
          title: noteData.title,
          content: noteData.content,
          note_type: noteData.type,
          timestamp: noteData.timestamp,
          tag_ids: noteData.tags?.map(t => t.id),
        },
        selectedPlayerUUID
      );
      console.log('✅ [Frontend] Note created successfully:', result);
      // Reload notes from server to ensure consistency
      await reloadNotes();
      setEditingNote(null);
    } catch (error: any) {
      console.error('❌ [Frontend] Error creating note:', error);
      console.error('   Status:', error.response?.status);
      console.error('   Message:', error.response?.data?.error || error.message);
      alert(`Failed to create note: ${error.response?.data?.error || error.message}`);
    }
  };

  // Handle note update
  const handleUpdateNote = async (note: NoteUI) => {
    try {
      await notesService.updateNote(note.id, {
        title: note.title,
        content: note.content,
        note_type: note.type,
        timestamp: note.timestamp,
        tag_ids: note.tags?.map(t => t.id),
      });
      // Reload notes from server to ensure consistency
      await reloadNotes();
      setEditingNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesService.deleteNote(noteId);
      // Reload notes from server to ensure consistency
      await reloadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Handle metadata save
  const handleSaveMetadata = async (metadataData: WorldMetadataUI) => {
    if (!saveData?.id) {
      console.error('❌ [Frontend] Cannot save metadata: no saveId');
      alert('Cannot save metadata: no save selected');
      return;
    }

    try {
      console.log('🌍 [Frontend] Saving metadata for saveId:', saveData.id);
      const result = await metadataService.updateMetadata(saveData.id, {
        description: metadataData.description,
        is_favorite: metadataData.is_favorite,
        theme_color: metadataData.theme_color,
        world_type: metadataData.world_type,
        modpack_name: metadataData.modpack_name,
        modpack_version: metadataData.modpack_version,
        project_id: metadataData.project_id as any,
      });
      console.log('✅ [Frontend] Metadata saved successfully:', result);
      setMetadata(result);
      setEditingMetadata(false);
    } catch (error: any) {
      console.error('❌ [Frontend] Error saving metadata:', error);
      console.error('   Status:', error.response?.status);
      console.error('   Message:', error.response?.data?.error || error.message);
      alert(`Failed to save metadata: ${error.response?.data?.error || error.message}`);
    }
  };


  // Manual refresh function for player data
  const handleRefreshPlayerData = useCallback(async () => {
    const savePath = saveData?.file_path || saveData?.path;
    if (!selectedPlayerUUID || !savePath) {
      console.warn('❌ Missing UUID or savePath for refresh');
      return;
    }

    setLoadingPlayerData(true);
    try {
      const api = (window as any).api;
      console.log('🔄 Manually refreshing player data...');
      const result = await api?.player?.extractPlayerData(savePath, selectedPlayerUUID);
      console.log('📦 Refreshed data:', result);
      const data = result?.data || null;
      setPlayerData(data);
      console.log('✅ Player data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing player data:', error);
    } finally {
      setLoadingPlayerData(false);
    }
  }, [saveData?.file_path, saveData?.path, selectedPlayerUUID]);

  // Debug logging
  console.log('🎮 SaveAnalyticsPage rendering with data:', {
    hasData: !!saveData,
    saveName: saveData?.name || saveData?.world_name,
    playerCount,
    players: players.length,
    dataKeys: saveData ? Object.keys(saveData).slice(0, 5) : 'no data',
  });

  if (!saveData) {
    console.error('❌ SaveAnalyticsPage: No saveData provided');
    return (
      <div className="save-analytics-page">
        <div className="save-analytics-header">
          <button className="save-analytics-back" onClick={onBack}>
            ← Back
          </button>
          <div className="save-analytics-title-section">
            <h1 className="save-analytics-title">Error</h1>
            <p className="save-analytics-subtitle">No save data available</p>
          </div>
        </div>
        <div className="save-analytics-content">
          <div className="save-analytics-section">
            <p>Unable to load save analytics. Please try selecting a save again.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get selected player's data if available
  const selectedPlayer = players.length > 0 ? players[selectedPlayerIndex] : null;

  // Normalize data to handle both camelCase and snake_case formats
  // Merge with real statistics data when available
  const data = useMemo(() => ({
    name: saveData.name || saveData.world_name || 'Unknown',
    gameMode: saveData.gameMode || saveData.game_mode || 'unknown',
    gameVersion: saveData.gameVersion || saveData.version || 'Unknown',
    playtime: statisticsData?.playtimeSeconds ?? (saveData.playtime || 0),
    seed: String(saveData.seed || saveData.seed_id || 'N/A'),
    createdAt: saveData.createdAt || saveData.created_at || Date.now(),
    lastPlayed: saveData.lastPlayed || saveData.last_played || Date.now(),
    difficulty: saveData.difficulty ?? 0,
    cheatsAllowed: saveData.cheatsAllowed || saveData.cheats_enabled || false,
    difficultyLocked: saveData.difficultyLocked || saveData.difficulty_locked || false,
    datapacks: Array.isArray(saveData.datapacks) ? saveData.datapacks : [],
    advancementsCompleted: advancementData?.completed ?? (saveData.advancementsCompleted || saveData.advancements_completed || 0),
    advancementsTotal: advancementData?.total ?? (saveData.advancementsTotal || saveData.advancements_total || 1),
    recipesUnlocked: statisticsData?.recipesUnlocked ?? (saveData.recipesUnlocked || saveData.recipes_unlocked || 0),
    structuresDiscovered: explorationData?.structuresDiscovered ?? [],
    spawnX: saveData.spawnX || saveData.spawn_x || 0,
    spawnY: saveData.spawnY || saveData.spawn_y || 0,
    spawnZ: saveData.spawnZ || saveData.spawn_z || 0,
    playerX: saveData.playerX || saveData.player_x || 0,
    playerY: saveData.playerY || saveData.player_y || 0,
    playerZ: saveData.playerZ || saveData.player_z || 0,
    lastDeathX: saveData.lastDeathX || saveData.last_death_x,
    lastDeathY: saveData.lastDeathY || saveData.last_death_y,
    lastDeathZ: saveData.lastDeathZ || saveData.last_death_z,
    explored: explorationData?.explored ?? (saveData.explored ?? 0),
    dimensionsVisited: explorationData?.dimensionsVisited ?? [],
    totalDistance: statisticsData?.totalDistance ?? (saveData.totalDistance || saveData.total_distance || 0),
    jumps: statisticsData?.jumps ?? (saveData.jumps || 0),
    swims: statisticsData?.swims ?? (saveData.swims || 0),
    blocksMined: statisticsData?.blocksMined ?? (saveData.blocksMined || saveData.blocks_mined || 0),
    blocksPlaced: statisticsData?.blocksPlaced ?? (saveData.blocksPlaced || saveData.blocks_placed || 0),
    itemsCrafted: statisticsData?.itemsCrafted ?? (saveData.itemsCrafted || saveData.items_crafted || 0),
    mobsKilled: statisticsData?.mobsKilled ?? (saveData.mobsKilled || saveData.mobs_killed || 0),
    deaths: statisticsData?.deaths ?? (saveData.deaths || 0),
    damageTaken: statisticsData?.damageTaken ?? (saveData.damageTaken || saveData.damage_taken || 0),
    inventoryItems: Array.isArray(saveData.inventoryItems) ? saveData.inventoryItems : [],
    armor: Array.isArray(saveData.armor) ? saveData.armor : [],
    enderChestItems: Array.isArray(saveData.enderChestItems) ? saveData.enderChestItems : [],
    weather: saveData.weather || 'clear',
    timeOfDay: saveData.timeOfDay || saveData.time_of_day || 0,
    moonPhase: saveData.moonPhase || saveData.moon_phase || 0,
    // Use selected player's stats if available, otherwise fall back to save data
    health: playerData?.health ?? selectedPlayer?.health ?? saveData.health ?? 20,
    hunger: playerData?.hunger ?? selectedPlayer?.hunger ?? saveData.hunger ?? 20,
    level: playerData?.xpLevel ?? selectedPlayer?.level ?? saveData.level ?? 0,
    xp: playerData?.xpProgress ?? selectedPlayer?.xp ?? saveData.xp ?? 0,
    effects: Array.isArray(saveData.effects) ? saveData.effects : [],
    foodEaten: statisticsData?.foodEaten ?? (saveData.foodEaten || saveData.food_eaten || 0),
    bedsSleptIn: statisticsData?.bedsSleptIn ?? (saveData.bedsSleptIn || saveData.beds_slept_in || 0),
  }), [saveData, statisticsData, advancementData, explorationData, playerData, selectedPlayer]);

  const advancementsPercent = useMemo(() =>
    Math.round((data.advancementsCompleted / data.advancementsTotal) * 100),
    [data.advancementsCompleted, data.advancementsTotal]
  );

  // Compute additional analytics metrics
  // Calculate actual days played (playtime is in seconds, 1 game day = 1200 seconds at 20 ticks/sec)
  const daysPlayed = useMemo(() =>
    Math.max(data.playtime / 1200, 0.01),
    [data.playtime]
  );

  const computedMetrics = useMemo(() => ({
    // Efficiency metrics
    miningRatio: data.blocksMined > 0 ? ((data.blocksPlaced / data.blocksMined) * 100).toFixed(1) : '0',
    miningEfficiency: data.blocksMined > 0 ? (data.blocksMined / Math.max(data.totalDistance / 100, 1)).toFixed(2) : '0', // blocks mined per 100 blocks traveled

    // Combat metrics
    kdRatio: data.deaths > 0 ? (data.mobsKilled / data.deaths).toFixed(2) : data.mobsKilled > 0 ? '∞' : '0',
    mobsPerDay: ((data.mobsKilled / daysPlayed)).toFixed(1),
    deathsPerDay: ((data.deaths / daysPlayed)).toFixed(2),

    // Exploration metrics
    explorationScore: Math.min(100, Math.round((data.explored * 2 + data.totalDistance / 1000) / 3)),
    traveledPerDay: ((data.totalDistance / daysPlayed) / 1000).toFixed(1), // km per day

    // Achievement metrics
    achievementRate: data.advancementsTotal > 0 ? ((data.advancementsCompleted / data.advancementsTotal) * 100).toFixed(1) : '0',

    // Crafting metrics
    itemsPerDay: ((data.itemsCrafted / daysPlayed)).toFixed(0),

    // Playstyle metrics
    isCreativeMode: data.gameMode.toLowerCase() === 'creative',
    isSurvivalMode: data.gameMode.toLowerCase() === 'survival',
  }), [data, daysPlayed]);

  console.log('🎮 SaveAnalyticsPage data normalized successfully, activeTab:', activeTab, 'Metrics:', computedMetrics);

  // Define tabs
  const tabs = [
    { id: 'progress', label: 'PROGRESS' },
    { id: 'playerStatus', label: 'PLAYER STATUS' },
    { id: 'exploration', label: 'EXPLORATION' },
    { id: 'stats', label: 'STATISTICS' },
    { id: 'inventory', label: 'INVENTORY' },
    { id: 'notes', label: 'NOTES' },
    { id: 'timeline', label: 'TIMELINE' },
    { id: 'advancements', label: '🏆 ADVANCEMENTS' },
  ];

  // Player controls for header
  const playerControls = (
    <div className="save-analytics-player-controls">
      {playerUUIDs.length === 1 && (
        <div className="save-analytics-player-display">
          <span>👤 Player: <strong>{playerNames[playerUUIDs[0]] || playerUUIDs[0].substring(0, 8) + '...'}</strong></span>
        </div>
      )}
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
      <button
        className="metadata-button"
        onClick={() => setEditingMetadata(true)}
        disabled={loadingMetadata}
        title="Edit world metadata, description, and settings"
      >
        {loadingMetadata ? '🌍 Loading...' : '🌍 Edit Info'}
      </button>
    </div>
  );

  return (
    <PageContainer fullScreen>
      <PageHeader
        title={data.name}
        onBack={onBack}
        rightContent={playerControls}
      />

      {/* Metadata Section */}
      <MetadataSection>
        <MetadataGrid>
          <MetadataItem label="🎮 Mode" value={data.gameMode.charAt(0).toUpperCase() + data.gameMode.slice(1)} />
          <MetadataItem label="📦 Version" value={data.gameVersion} />
          <MetadataItem label="⚙️ Difficulty" value={['Peaceful', 'Easy', 'Normal', 'Hard'][data.difficulty] || 'Unknown'} />
          <MetadataItem label="📋 Seed" value={data.seed.substring(0, 10) + '...'} isMonospace title={data.seed} />
          <MetadataItem label="📅 Created" value={new Date(data.createdAt).toLocaleDateString()} />
          <MetadataItem label="⏱️ Last Played" value={new Date(data.lastPlayed).toLocaleDateString()} />
          <MetadataItem label="🔧 Cheats" value={data.cheatsAllowed ? '✅' : '❌'} />
        </MetadataGrid>
      </MetadataSection>

      {/* Tabs */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      />

      {/* Content */}
      <TabContent>
        {/* Identity Tab */}
        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="save-analytics-section">
            <h2>Progress & Completion</h2>
            {loadingProgress && <p style={{ textAlign: 'center', color: '#888' }}>Loading progress data...</p>}
            <div className="save-analytics-grid">
              <div className="save-analytics-card">
                <h3>⏱️ Playtime</h3>
                <dl>
                  <dt>Total Playtime</dt>
                  <dd>{formatPlaytime(data.playtime)}</dd>
                  <dt>Days Played</dt>
                  <dd>{(daysPlayed).toFixed(1)} game days</dd>
                  <dt>Created</dt>
                  <dd>{new Date(data.createdAt).toLocaleDateString()}</dd>
                  <dt>Last Played</dt>
                  <dd>{new Date(data.lastPlayed).toLocaleDateString()}</dd>
                </dl>
              </div>

              <div className="save-analytics-card save-analytics-card-full">
                <h3>📜 Advancements Progress</h3>
                {advancementData ? (
                  <div className="save-analytics-progress-section">
                    <div className="save-analytics-progress-header">
                      <span className="save-analytics-progress-label">
                        {advancementData.completed} / {advancementData.total} completed
                      </span>
                      <span className="save-analytics-progress-percent">
                        {advancementData.total > 0 ? Math.round((advancementData.completed / advancementData.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="save-analytics-progress-bar-large">
                      <div
                        className="save-analytics-progress-fill"
                        style={{ width: `${advancementData.total > 0 ? Math.round((advancementData.completed / advancementData.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="save-analytics-progress-section">
                    <div className="save-analytics-progress-header">
                      <span className="save-analytics-progress-label">
                        {data.advancementsCompleted} / {data.advancementsTotal} completed
                      </span>
                      <span className="save-analytics-progress-percent">{advancementsPercent}%</span>
                    </div>
                    <div className="save-analytics-progress-bar-large">
                      <div
                        className="save-analytics-progress-fill"
                        style={{ width: `${advancementsPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="save-analytics-card">
                <h3>🔓 Unlocks</h3>
                <dl>
                  <dt>Recipes Unlocked</dt>
                  <dd>{formatNumber(advancementData?.recipesUnlocked ?? statisticsData?.recipesUnlocked ?? data.recipesUnlocked ?? 0)}</dd>
                </dl>
              </div>

              <div className="save-analytics-card">
                <h3>🗺️ Discoveries</h3>
                <dl>
                  <dt>Structures Found</dt>
                  <dd>{data.structuresDiscovered.length}</dd>
                </dl>
                {data.structuresDiscovered.length > 0 && (
                  <div className="save-analytics-structures-grid">
                    {data.structuresDiscovered.map((struct) => (
                      <div key={struct} className="save-analytics-structure-item" title={struct}>
                        <span className="save-analytics-structure-icon">{getStructureIcon(struct)}</span>
                        <span className="save-analytics-structure-name">{struct.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {statisticsData && (
                <>
                  <div className="save-analytics-card">
                    <h3>⛏️ Mining & Gathering</h3>
                    <dl>
                      <dt>Blocks Mined</dt>
                      <dd>{formatNumber(statisticsData.blocksMined)}</dd>
                      <dt>Blocks Placed</dt>
                      <dd>{formatNumber(statisticsData.blocksPlaced)}</dd>
                    </dl>
                  </div>

                  <div className="save-analytics-card">
                    <h3>🎣 Crafting & Combat</h3>
                    <dl>
                      <dt>Items Crafted</dt>
                      <dd>{formatNumber(statisticsData.itemsCrafted)}</dd>
                      <dt>Mobs Killed</dt>
                      <dd>{formatNumber(statisticsData.mobsKilled)}</dd>
                    </dl>
                  </div>

                  <div className="save-analytics-card">
                    <h3>❤️ Health & Survival</h3>
                    <dl>
                      <dt>Deaths</dt>
                      <dd>{formatNumber(statisticsData.deaths)}</dd>
                      <dt>Damage Taken</dt>
                      <dd>{formatNumber(statisticsData.damageTaken)} half-hearts</dd>
                      <dt>Beds Slept In</dt>
                      <dd>{formatNumber(statisticsData.bedsSleptIn)}</dd>
                    </dl>
                  </div>

                  <div className="save-analytics-card">
                    <h3>🏃 Movement</h3>
                    <dl>
                      <dt>Distance Traveled</dt>
                      <dd>{formatNumber(statisticsData.totalDistance)} cm</dd>
                      <dt>Jumps</dt>
                      <dd>{formatNumber(statisticsData.jumps)}</dd>
                      <dt>Swimming Distance</dt>
                      <dd>{formatNumber(statisticsData.swims)} cm</dd>
                    </dl>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Player Status Tab */}
        {activeTab === 'playerStatus' && (
          <div className="save-analytics-section">
            <h2>Player Status</h2>

            {/* Use PlayerInfoTab component for detailed player data */}
            {playerUUIDs.length > 0 ? (
              <PlayerInfoTab playerData={playerData} loading={loadingPlayerData} />
            ) : (
              <div className="save-analytics-card">
                <p>No player data available for this save</p>
              </div>
            )}
          </div>
        )}






        {/* Exploration Tab - Merged Location + World Exploration */}
        {activeTab === 'exploration' && (
          <div className="save-analytics-section">
            <h2>World Exploration</h2>
            {loadingExploration && <p style={{ textAlign: 'center', color: '#888' }}>Loading exploration data...</p>}
            <div className="save-analytics-grid">
              <div className="save-analytics-card save-analytics-card-full">
                <h3>🗺️ Exploration Progress</h3>
                <div className="save-analytics-progress-section">
                  <div className="save-analytics-progress-header">
                    <span className="save-analytics-progress-label">World Explored</span>
                    <span className="save-analytics-progress-percent">{data.explored}%</span>
                  </div>
                  <div className="save-analytics-progress-bar-large">
                    <div
                      className="save-analytics-progress-fill"
                      style={{ width: `${data.explored}%`, background: '#10b981' }}
                    />
                  </div>
                </div>
              </div>

              <div className="save-analytics-card">
                <h3>📍 Coordinates</h3>
                <dl>
                  <dt>Spawn Point</dt>
                  <dd className="monospace">{formatCoords(data.spawnX, data.spawnY, data.spawnZ)}</dd>
                  <dt>Current Location</dt>
                  <dd className="monospace">{formatCoords(data.playerX, data.playerY, data.playerZ)}</dd>
                  {data.lastDeathX !== undefined && data.lastDeathY !== undefined && data.lastDeathZ !== undefined && (
                    <>
                      <dt>Last Death</dt>
                      <dd className="monospace">
                        {formatCoords(data.lastDeathX, data.lastDeathY, data.lastDeathZ)}
                      </dd>
                    </>
                  )}
                </dl>
              </div>

              <div className="save-analytics-card">
                <h3>🌍 Dimensions Visited</h3>
                <div className="save-analytics-dimensions">
                  {['Overworld', 'Nether', 'End'].map((dim) => {
                    const visited = data.dimensionsVisited && data.dimensionsVisited.map((d: string) => d.toLowerCase()).includes(dim.toLowerCase());
                    return (
                      <div key={dim} className={`save-analytics-dimension-item ${visited ? 'visited' : ''}`}>
                        <span className="save-analytics-dimension-icon">
                          {dim === 'Overworld' ? '🌍' : dim === 'Nether' ? '🔥' : '👑'}
                        </span>
                        <span className="save-analytics-dimension-name">{dim}</span>
                        <span className="save-analytics-dimension-status">
                          {visited ? '✓ Visited' : '○ Not Visited'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {data.dimensionsVisited && data.dimensionsVisited.length > 0 && (
                <div className="save-analytics-card">
                  <h3>Custom Dimensions</h3>
                  <div className="save-analytics-list">
                    {data.dimensionsVisited.map((dim) => (
                      <span key={dim} className="save-analytics-list-item">
                        {dim}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.structuresDiscovered && data.structuresDiscovered.length > 0 && (
                <div className="save-analytics-card">
                  <h3>🏛️ Structures Discovered</h3>
                  <div className="save-analytics-list">
                    {data.structuresDiscovered.map((struct) => (
                      <span key={struct} className="save-analytics-list-item">
                        {struct}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics Tab - Merged Gameplay Stats + Richness Metrics */}
        {activeTab === 'stats' && (
          <div className="save-analytics-section">
            <h2>Statistics & Achievements</h2>
            {loadingStats && <p style={{ textAlign: 'center', color: '#888' }}>Loading statistics...</p>}
            <div className="save-analytics-grid">
              <div className="save-analytics-card">
                <h3>🏃 Movement</h3>
                <dl>
                  <dt>Total Distance</dt>
                  <dd>{formatNumber(data.totalDistance)} blocks</dd>
                  <dt>Jumps</dt>
                  <dd>{formatNumber(data.jumps)}</dd>
                  <dt>Swims</dt>
                  <dd>{formatNumber(data.swims)}</dd>
                </dl>
              </div>

              <div className="save-analytics-card">
                <h3>🧱 Building</h3>
                <dl>
                  <dt>Blocks Placed</dt>
                  <dd>{formatNumber(data.blocksPlaced)}</dd>
                  <dt>Blocks Mined</dt>
                  <dd>{formatNumber(data.blocksMined)}</dd>
                  <dt>Ratio</dt>
                  <dd className="save-analytics-ratio">
                    {data.blocksMined > 0 ? ((data.blocksPlaced / data.blocksMined) * 100).toFixed(1) : 0}% placed
                  </dd>
                </dl>
              </div>

              <div className="save-analytics-card">
                <h3>🔨 Crafting & Gathering</h3>
                <dl>
                  <dt>Items Crafted</dt>
                  <dd>{formatNumber(data.itemsCrafted)}</dd>
                  <dt>Distance Traveled</dt>
                  <dd>{formatNumber(Math.round(data.totalDistance / 1000))} km</dd>
                </dl>
              </div>

              <div className="save-analytics-card">
                <h3>⚔️ Combat</h3>
                <dl>
                  <dt>Mobs Killed</dt>
                  <dd>{formatNumber(data.mobsKilled)}</dd>
                  <dt>Deaths</dt>
                  <dd>{formatNumber(data.deaths)}</dd>
                  <dt>K/D Ratio</dt>
                  <dd className="save-analytics-ratio">
                    {data.deaths > 0 ? (data.mobsKilled / data.deaths).toFixed(2) : data.mobsKilled > 0 ? '∞' : '0'}
                  </dd>
                </dl>
              </div>

              <div className="save-analytics-card">
                <h3>❤️ Survival</h3>
                <dl>
                  <dt>Damage Taken</dt>
                  <dd>{formatNumber(Math.round(data.damageTaken))} hp</dd>
                  <dt>Food Eaten</dt>
                  <dd>{formatNumber(data.foodEaten)}</dd>
                  <dt>Beds Slept In</dt>
                  <dd>{formatNumber(data.bedsSleptIn)}</dd>
                </dl>
              </div>

              <div className="save-analytics-card">
                <h3>📊 Daily Activity</h3>
                <dl>
                  <dt>Mobs Killed/Day</dt>
                  <dd>{computedMetrics.mobsPerDay}</dd>
                  <dt>Deaths/Day</dt>
                  <dd>{computedMetrics.deathsPerDay}</dd>
                  <dt>Items Crafted/Day</dt>
                  <dd>{computedMetrics.itemsPerDay}</dd>
                  <dt>Distance Traveled/Day</dt>
                  <dd>{computedMetrics.traveledPerDay} km</dd>
                </dl>
              </div>

              <div className="save-analytics-card">
                <h3>⛏️ Efficiency Metrics</h3>
                <dl>
                  <dt>Mining Efficiency</dt>
                  <dd>{computedMetrics.miningEfficiency} blocks/100 blocks traveled</dd>
                  <dt>Build Ratio</dt>
                  <dd className="save-analytics-ratio">{computedMetrics.miningRatio}% placed vs mined</dd>
                  <dt>Exploration Score</dt>
                  <dd className="save-analytics-ratio">{computedMetrics.explorationScore}/100</dd>
                </dl>
              </div>

              <div className="save-analytics-card save-analytics-card-full">
                <h3>🎖️ Achievement Score</h3>
                <div className="save-analytics-richness-score">
                  <div className="save-analytics-richness-meter">
                    {(() => {
                      const score = Math.min(
                        100,
                        (data.mobsKilled * 0.1 +
                          data.blocksPlaced * 0.001 +
                          data.itemsCrafted * 0.05 +
                          data.advancementsCompleted * 2) /
                          2
                      );
                      return (
                        <>
                          <div
                            className="save-analytics-richness-fill"
                            style={{ width: `${Math.round(score)}%` }}
                          />
                          <span className="save-analytics-richness-label">{Math.round(score)}/100</span>
                        </>
                      );
                    })()}
                  </div>
                  <p className="save-analytics-richness-description">
                    Based on mobs killed, blocks placed, items crafted, and advancements completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="save-analytics-section">
            <h2>Inventory & Equipment</h2>
            {playerUUIDs.length > 0 ? (
              <div className="save-analytics-grid">
                <div className="save-analytics-card save-analytics-card-full">
                  <h3>⚔️ Equipped Items</h3>
                  {playerData?.armor && playerData.armor.length > 0 ? (
                    <div className="save-analytics-item-list">
                      <div className="armor-display">
                        {playerData.armor.map((armorItem) => (
                          <div key={`${armorItem.slot}-${armorItem.id}`} className="armor-slot">
                            <span className="armor-label">
                              {armorItem.slot === 'head' ? '🧢 Helmet' : armorItem.slot === 'chest' ? '👕 Chestplate' : armorItem.slot === 'legs' ? '👖 Leggings' : '👞 Boots'}
                            </span>
                            <span className="armor-item">
                              {armorItem.id.replace('minecraft:', '').replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="save-analytics-empty">No armor equipped</p>
                  )}
                </div>

                <div className="save-analytics-card save-analytics-card-full">
                  <h3>🎒 Main Inventory ({playerData?.inventory?.length || 0} items)</h3>
                  {playerData?.inventory && playerData.inventory.length > 0 ? (
                    <div className="save-analytics-item-list">
                      {playerData.inventory.slice(0, 36).map((item, idx) => (
                        <div key={`inv-${idx}-${item.id}`} className="save-analytics-item">
                          <span className="save-analytics-item-name">
                            {item.id.replace('minecraft:', '').replace(/_/g, ' ')} {item.count > 1 ? `×${item.count}` : ''}
                          </span>
                        </div>
                      ))}
                      {playerData.inventory.length > 36 && (
                        <p className="save-analytics-more-items">
                          +{playerData.inventory.length - 36} more items
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="save-analytics-empty">Empty inventory</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="save-analytics-card">
                <p>No player data available. Load a player first.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="save-analytics-tab-content">
            {editingNote ? (
              <NoteEditor
                note={editingNote}
                onSave={async (noteData) => {
                  if (editingNote.id === 'new') {
                    // Creating new note
                    await handleCreateNote(noteData);
                  } else {
                    // Updating existing note
                    await handleUpdateNote({ ...noteData, id: editingNote.id } as NoteUI);
                  }
                  setEditingNote(null);
                }}
                onCancel={() => setEditingNote(null)}
                saveName={saveData?.name || 'Unknown'}
                tags={tags}
              />
            ) : (
              <NoteList
                notes={notes}
                tags={tags}
                onEdit={setEditingNote}
                onDelete={handleDeleteNote}
                onCreateNew={() => setEditingNote({
                  id: 'new',
                  title: '',
                  content: '',
                  type: 'general',
                  timestamp: new Date(),
                  created_at: new Date(),
                  updated_at: new Date(),
                  tags: [],
                } as NoteUI)}
                loading={loadingNotes}
              />
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="save-analytics-tab-content">
            <Timeline
              events={timelineEvents}
              loading={loadingTimeline}
              onSelectEvent={(event) => {
                console.log('Selected timeline event:', event);
              }}
            />
          </div>
        )}

        {activeTab === 'advancements' && advancementData && (
          <div className="save-analytics-tab-content">
            <AdvancementsTab
              advancements={advancementData.advancements}
              loading={loadingProgress}
            />
          </div>
        )}
      </TabContent>

      {/* World Metadata Editor Modal */}
      {editingMetadata && metadata && (
        <div className="modal-overlay" onClick={() => setEditingMetadata(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <WorldMetadataEditor
              metadata={metadata}
              onSave={handleSaveMetadata}
              onCancel={() => setEditingMetadata(false)}
              worldName={saveData?.name || 'Unknown'}
            />
          </div>
        </div>
      )}
    </PageContainer>
  );
};
