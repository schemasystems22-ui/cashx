import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** `/` locally. GitHub Pages sets `VITE_BASE=/cashx/` so assets stay on the project site. */
function siteBase(): string {
  const raw = (process.env.VITE_BASE || '/').trim();
  if (raw === '' || raw === '/') return '/';
  const withSlash = raw.endsWith('/') ? raw : `${raw}/`;
  return withSlash.startsWith('/') ? withSlash : `/${withSlash}`;
}

const base = siteBase();

export default defineConfig({
  base,
  plugins: [
    react(),
    /*
     * Installable, offline-capable PWA.
     *
     * `registerType: 'autoUpdate'` plus `injectRegister: 'auto'` means the built
     * index.html gets a tiny registration script: a new deploy installs in the
     * background and activates on the next load, with no in-app update prompt to
     * maintain. The precache manifest is generated from the build output, so the
     * hashed bundles are covered without hard-coding filenames.
     */
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        id: base,
        name: 'CashX — Money transfer',
        short_name: 'CashX',
        description:
          'CashX demo: send money from any wallet to any wallet. Arabic and English. Simulated only — no real payments.',
        lang: 'en',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#09051E',
        theme_color: '#0A0420',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'assets/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Every screen is already addressable, so launcher shortcuts come free.
        shortcuts: [
          {
            name: 'تحويل / Transfer',
            short_name: 'Transfer',
            url: `${base}?screen=transfer&step=1`,
            icons: [{ src: 'assets/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'إضافة رصيد / Add Balance',
            short_name: 'Add Balance',
            url: `${base}?screen=addBalance&step=1`,
            icons: [{ src: 'assets/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Icons and brand logos are precached too, so a receipt exported offline
        // still has its wallet marks.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg}'],
        // The manifest's own icons are added to the precache list by the plugin's
        // config, so globbing them as well would list each one twice. The source
        // app icon is only an asset for regenerating them, never fetched at run
        // time, so there is nothing to gain by shipping it to the cache.
        globIgnores: ['**/assets/icons/*.png', '**/assets/cashx-app-icon.jpg'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // The stylesheet that names the font files.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cashx-font-css',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The font binaries themselves never change under a given URL.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cashx-font-files',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5178,
  },
  preview: {
    host: '127.0.0.1',
    port: 4178,
  },
});
