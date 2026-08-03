import { defineConfig } from 'vite';

/**
 * The iframe app build.
 *
 * Served from our own origin (WIDGET_ORIGIN) and loaded only when a visitor actually opens
 * the widget, so its size budget is far more generous than the loader's. The Chime SDK is
 * lazy-loaded again from here, on first *voice* session — text-only visitors never download
 * the WebRTC stack.
 */
export default defineConfig({
  root: 'src/app',
  build: {
    outDir: '../../dist/app',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: true,
  },
});
