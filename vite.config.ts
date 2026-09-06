import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { guidesPlugin } from './scripts/guides-plugin.ts';

export default defineConfig({
  plugins: [react(), guidesPlugin()],
  resolve: {
    // '/src' is resolved relative to the project root by Vite.
    alias: { '@': '/src', '@kaizen/domain': '/packages/domain/src/index.ts', '@kaizen/importers': '/packages/importers/src/index.ts' },
  },
  server: { port: 5180, strictPort: true },
});
