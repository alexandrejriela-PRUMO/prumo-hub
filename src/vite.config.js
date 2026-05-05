import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache bust: 2026-05-05c
const reactPath = path.resolve(__dirname, './node_modules/react');
const reactDomPath = path.resolve(__dirname, './node_modules/react-dom');

export default defineConfig({
  plugins: [
    base44(),
    react(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': reactPath,
      'react-dom': reactDomPath,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@base44/sdk'],
    force: true,
  },
});