// Dev-only preview of the post UI with a mocked API. Not part of the Devvit build.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      '@devvit/web/client': fileURLToPath(
        new URL('./devvit-stub.ts', import.meta.url)
      ),
    },
  },
  server: { port: 5199, strictPort: true, fs: { allow: ['..'] } },
});
