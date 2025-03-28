import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/build/**'],
    environment: 'node',
  },
});
