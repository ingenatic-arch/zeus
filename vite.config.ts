import { defineConfig } from 'vitest/config';
import { prepared } from './scripts/prepared.ts';

// base './' so the built dist/ works as static files from any path.
export default defineConfig({
  base: './',
  // Every demo's town prepared when the game is built (scripts/prepared.ts), so a demo opens without playing its history.
  plugins: [prepared()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Many tests play a prepared town on for months or years: a few seconds each, more on a busy machine.
    testTimeout: 30000,
  },
});
