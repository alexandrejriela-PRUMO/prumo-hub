import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const reactPath = path.resolve(__dirname, 'node_modules/react');
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom');
const schedulerPath = path.resolve(__dirname, 'node_modules/scheduler');

// Cache bust: 2026-05-05j
export default defineConfig({
  plugins: [
    base44(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': reactPath,
      'react-dom': reactDomPath,
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
      'scheduler': schedulerPath,
    },
    dedupe: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler'],
    exclude: ['@base44/sdk'],
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
        },
      },
    },
  },
});