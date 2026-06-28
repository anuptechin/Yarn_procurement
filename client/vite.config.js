import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies API calls to the Express backend on :4043.
// Production build is emitted to client/dist and served by Express.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4043',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
