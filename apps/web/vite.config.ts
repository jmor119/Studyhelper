import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const root = path.resolve(import.meta.dirname, '../..');

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Study Helper',
        short_name: 'Study Helper',
        description: 'Maths and science study and exam prep for NZ students.',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/mcp/, /^\/oauth\/(authorize|token|register)/, /^\/\.well-known/],
      },
    }),
  ],
  resolve: {
    alias: { '@content': path.join(root, 'content') },
  },
  server: {
    port: 5173,
    fs: { allow: [root] },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
