import { defineConfig } from 'vite';

/**
 * The loader build.
 *
 * This script runs on every merchant page, for every visitor, whether or not they ever open
 * the widget. Its size is a tax on their Core Web Vitals — and a slow widget is the first
 * thing a merchant blames and removes.
 *
 * Budget: < 5kb gzipped. It must only create a bubble, an iframe, and a postMessage bridge.
 * Anything heavier belongs in the iframe app, which loads lazily on first open.
 *
 * IIFE format, no module preamble, no polyfills — it has to run as a plain <script> tag on
 * pages of any vintage.
 */
export default defineConfig({
  build: {
    lib: {
      entry: 'src/loader/index.ts',
      name: 'SoniqLoader',
      formats: ['iife'],
      fileName: () => 'soniq.js',
    },
    outDir: 'dist/loader',
    emptyOutDir: true,
    // Old enough to cover the long tail of merchant-site visitors, modern enough to avoid
    // dragging in transpilation weight.
    target: 'es2018',
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2 },
      format: { comments: false },
    },
    reportCompressedSize: true,
  },
});
