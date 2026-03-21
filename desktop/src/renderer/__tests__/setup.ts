import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.api for Electron context
Object.defineProperty(window, 'api', {
  value: {
    scanner: {
      getSaves: vi.fn(),
      getInstanceMetadata: vi.fn(),
      scanAllFolders: vi.fn(),
      listFolders: vi.fn(),
      addFolder: vi.fn(),
      removeFolder: vi.fn(),
      scanFolder: vi.fn(),
    },
    favorites: {
      getAll: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    },
    auth: {
      getLocalAccounts: vi.fn(),
    },
    shell: {
      openPath: vi.fn(),
    },
    fs: {
      selectFolder: vi.fn(),
    },
  },
  writable: true,
  configurable: true,
});
