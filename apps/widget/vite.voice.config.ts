import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../dashboard/public/embed/v2',
    emptyOutDir: false,
    target: 'es2020',
    sourcemap: true,
    lib: {
      entry: 'src/voice-embed.ts',
      formats: ['es'],
      fileName: () => 'voice-client.js',
    },
  },
});
