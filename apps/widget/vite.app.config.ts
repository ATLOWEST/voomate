import { defineConfig } from 'vite';

/**
 * The iframe app build.
 *
 * Served from our own origin (WIDGET_ORIGIN) and loaded only when a visitor actually opens
 * the widget, so its size budget is far more generous than the loader's. Voice needs no SDK
 * download at all — a plain WebSocket and the Web Audio API, both already in the browser.
 *
 * The API origin is fixed at build time. It has to be, because it appears in the iframe's
 * `connect-src` policy as well as in the code: a runtime-configurable API origin would mean a
 * CSP wide enough to permit any host, which is most of the reason the widget runs in its own
 * frame at all. `VITE_API_URL` sets it per environment, and both the policy and the code are
 * generated from that one value, so they cannot drift apart.
 */
const apiOrigin = process.env.VITE_API_URL ?? 'http://localhost:4000';
const apiSocketOrigin = apiOrigin.replace(/^http/, 'ws');

const contentSecurityPolicy = [
  "default-src 'self'",
  `connect-src 'self' ${apiOrigin} ${apiSocketOrigin}`,
  // blob: and data: here are for locally generated audio, never for scripts.
  "media-src 'self' blob: data:",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  // No 'unsafe-inline', no blob: — which is why the audio worklet is a real file on disk
  // rather than a generated blob URL.
  "script-src 'self'",
  "worker-src 'self'",
].join('; ');

export default defineConfig({
  root: 'src/app',
  define: {
    __API_ORIGIN__: JSON.stringify(apiOrigin),
  },
  plugins: [
    {
      name: 'voomate-csp',
      transformIndexHtml: (html) => html.replace('%CSP%', contentSecurityPolicy),
    },
  ],
  build: {
    outDir: '../../dist/app',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: true,
    /**
     * The audio worklet must stay a real file.
     *
     * Vite inlines small assets as `data:` URLs, and the worklet is well under the threshold.
     * That would be fine anywhere else — but a worklet is *loaded as a script*, and the policy
     * above allows scripts from `'self'` only. An inlined worklet is refused by the browser,
     * and the symptom is a microphone that captures silence with nothing in the UI to explain
     * it. Everything else may inline as usual.
     */
    assetsInlineLimit: (filePath: string) =>
      filePath.endsWith('pcm-worklet.js') ? false : undefined,
  },
});
