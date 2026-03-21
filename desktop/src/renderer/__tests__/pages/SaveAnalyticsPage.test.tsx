import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SaveAnalyticsPage from '../../pages/SaveAnalyticsPage';

// Mock the components and services
vi.mock('../../components/PlayerInfoTab', () => ({
  default: () => <div>PlayerInfoTab</div>,
}));

vi.mock('../../components/shared', () => ({
  PageContainer: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title, rightContent }: any) => (
    <div>
      <h1>{title}</h1>
      <div className="header-content">{rightContent}</div>
    </div>
  ),
  MetadataGrid: ({ children }: any) => <div>{children}</div>,
  MetadataItem: ({ label, value }: any) => <div>{label}: {value}</div>,
  MetadataSection: ({ children }: any) => <div>{children}</div>,
  TabNavigation: ({ tabs, activeTab, onTabChange }: any) => (
    <div>
      {tabs.map((tab: any) => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  ),
  TabContent: ({ children }: any) => <div>{children}</div>,
  ContentSection: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../services/notesService', () => ({
  fetchNotes: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('../../services/metadataService', () => ({
  fetchMetadata: vi.fn(),
  updateMetadata: vi.fn(),
}));

vi.mock('../../services/timelineService', () => ({
  fetchTimeline: vi.fn(),
}));

describe('SaveAnalyticsPage - Issue #14: Single Player Display', () => {
  const mockSaveData = {
    id: 'test-save-1',
    name: 'Test World',
    world_name: 'Test World',
    file_path: '/test/path',
    gameMode: 'survival',
    version: '1.20',
    hasPlayerData: true,
  };

  beforeEach(() => {
    // Mock the API
    (window as any).api = {
      player: {
        getPlayerList: vi.fn(),
        extractPlayerData: vi.fn(),
        getPlayerName: vi.fn(),
      },
      progress: {
        extractAdvancements: vi.fn(),
        extractStatistics: vi.fn(),
      },
      exploration: {
        extractExploration: vi.fn(),
      },
      saves: {
        getMetadata: vi.fn(),
      },
      instance: {
        getMetadata: vi.fn(),
      },
    };
  });

  it('should show player name directly when only one player exists', async () => {
    const singlePlayerUUID = '00000000-0000-0000-0000-000000000001';

    // Mock API responses
    (window as any).api.player.getPlayerList.mockResolvedValue([singlePlayerUUID]);
    (window as any).api.player.getPlayerName.mockResolvedValue({
      success: true,
      name: 'Steve',
    });
    (window as any).api.player.extractPlayerData.mockResolvedValue({
      data: { health: 20, hunger: 20 },
    });

    const { container } = render(
      <SaveAnalyticsPage saveData={mockSaveData} onBack={() => {}} />
    );

    // Wait for player names to be loaded
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that the single player display is shown (not a dropdown)
    const playerDisplay = container.querySelector('.save-analytics-player-display');
    expect(playerDisplay).toBeTruthy();
    expect(playerDisplay?.textContent).toContain('👤 Player:');
    expect(playerDisplay?.textContent).toContain('Steve');

    // Check that the dropdown is NOT shown
    const playerSelector = container.querySelector('.save-analytics-player-selector');
    expect(playerSelector).toBeFalsy();
  });

  it('should show player dropdown when multiple players exist', async () => {
    const player1UUID = '00000000-0000-0000-0000-000000000001';
    const player2UUID = '00000000-0000-0000-0000-000000000002';

    // Mock API responses for multiple players
    (window as any).api.player.getPlayerList.mockResolvedValue([player1UUID, player2UUID]);
    (window as any).api.player.getPlayerName.mockImplementation((uuid: string) =>
      Promise.resolve({
        success: true,
        name: uuid === player1UUID ? 'Steve' : 'Alex',
      })
    );
    (window as any).api.player.extractPlayerData.mockResolvedValue({
      data: { health: 20, hunger: 20 },
    });

    const { container } = render(
      <SaveAnalyticsPage saveData={mockSaveData} onBack={() => {}} />
    );

    // Wait for player names to be loaded
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that the dropdown is shown (not the single display)
    const playerSelector = container.querySelector('.save-analytics-player-selector');
    expect(playerSelector).toBeTruthy();

    // Check that the single player display is NOT shown
    const playerDisplay = container.querySelector('.save-analytics-player-display');
    expect(playerDisplay).toBeFalsy();

    // Check that both players are available in the dropdown
    const options = container.querySelectorAll('option');
    const playerNames = Array.from(options).map((opt) => opt.textContent);
    expect(playerNames).toContain('Steve');
    expect(playerNames).toContain('Alex');
  });

  it('should display player name in bold styling', async () => {
    const singlePlayerUUID = '00000000-0000-0000-0000-000000000001';

    (window as any).api.player.getPlayerList.mockResolvedValue([singlePlayerUUID]);
    (window as any).api.player.getPlayerName.mockResolvedValue({
      success: true,
      name: 'Steve',
    });
    (window as any).api.player.extractPlayerData.mockResolvedValue({
      data: { health: 20, hunger: 20 },
    });

    const { container } = render(
      <SaveAnalyticsPage saveData={mockSaveData} onBack={() => {}} />
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const playerDisplay = container.querySelector('.save-analytics-player-display');
    const strongElement = playerDisplay?.querySelector('strong');
    expect(strongElement).toBeTruthy();
    expect(strongElement?.textContent).toBe('Steve');
  });

  it('should fallback to UUID when player name is unavailable', async () => {
    const singlePlayerUUID = '00000000-0000-0000-0000-000000000001';

    (window as any).api.player.getPlayerList.mockResolvedValue([singlePlayerUUID]);
    (window as any).api.player.getPlayerName.mockResolvedValue({
      success: false,
    });
    (window as any).api.player.extractPlayerData.mockResolvedValue({
      data: { health: 20, hunger: 20 },
    });

    const { container } = render(
      <SaveAnalyticsPage saveData={mockSaveData} onBack={() => {}} />
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const playerDisplay = container.querySelector('.save-analytics-player-display');
    // Should show UUID prefix when name is not available
    expect(playerDisplay?.textContent).toMatch(/00000000/);
  });
});
