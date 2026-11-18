import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // registered via useRegisterSW in src/hooks/useServiceWorker.ts
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png', 'robots.txt'],
      manifest: {
        id: '/',
        name: 'Collab Tracker',
        short_name: 'Collabs',
        description: 'Offline-first pipeline for creator brand deals, sponsorships and collabs.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#09090b',
        theme_color: '#09090b',
        categories: ['productivity', 'business'],
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'New collab', url: '/pipeline?new=1', icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }] },
          { name: 'Pipeline', url: '/pipeline', icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // Precache the full app shell so the very first offline launch works.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Anything same-origin that wasn't precached (e.g. new static files): serve fast, refresh in background.
            urlPattern: ({ sameOrigin, request }) => sameOrigin && request.destination !== 'document',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'ct-static', expiration: { maxEntries: 200 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'ct-images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
