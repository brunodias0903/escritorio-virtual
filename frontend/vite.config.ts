import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@design-system': fileURLToPath(
        new URL('../design-system/src', import.meta.url),
      ),
      tamagui: fileURLToPath(
        new URL('./node_modules/tamagui', import.meta.url),
      ),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'livekit',
              test: /node_modules\/livekit-client/,
            },
            {
              name: 'vendor',
              test: /node_modules\/(react|react-dom|zustand|zod)/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5000,
    host: true,
  },
  preview: {
    port: 5000,
    host: true,
  },
});
