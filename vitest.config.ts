import { defineConfig } from 'vitest/config';

/**
 * The unit suite covers the pure money/format/id helpers, so it runs in a plain
 * node environment — no DOM, no React plugin, no jsdom dependency. Component
 * tests would need `environment: 'jsdom'` and the React plugin added here.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
