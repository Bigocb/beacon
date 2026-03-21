import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'dist/**',
      ],
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90,
    },
  },
});
