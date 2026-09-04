import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: ['server/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    exclude: ['tests/**', 'node_modules/**', '.agents/**', 'dist/**'],
  },
});
