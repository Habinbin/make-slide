import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// The make-slide core assets (themes / layouts / core) live one level up,
// outside this Vite root. We copy them into the build output AND serve them
// during dev so the browser can fetch /themes/<id>/reference.html etc.
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: '../themes/*', dest: 'themes' },
        { src: '../layouts/*', dest: 'layouts' },
        { src: '../core/*', dest: 'core' },
      ],
    }),
  ],
  server: {
    port: 5180,
  },
});
