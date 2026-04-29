import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import base44 from '@base44/vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactPath = path.resolve(__dirname, 'node_modules/react');
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom');

export default defineConfig({
  plugins: [
    base44(),
    react(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'scheduler'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': reactPath,
      'react-dom': reactDomPath,
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    force: true,
    esbuildOptions: {
      target: 'es2020',
    },
  },
});