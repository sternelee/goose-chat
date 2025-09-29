import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
    outDir: 'dist',
  },
  server: {
    port: 5173,
    host: true,
  },
});
