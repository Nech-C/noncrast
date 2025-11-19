import { defineConfig } from 'vite';

// Vite config for Electron main process.
// Externalize native modules like better-sqlite3 so Node loads their .node at runtime.
export default defineConfig({
  build: {
    target: 'node20',
    sourcemap: true,
    rollupOptions: {
      external: [
        // native addon + helper used by it
        'better-sqlite3',
        'bindings',
      ],
    },
    commonjsOptions: {
      // better-sqlite3/bindings uses dynamic require to resolve the .node
      ignoreDynamicRequires: true,
    },
  },
  optimizeDeps: {
    // ensure esbuild doesn't try to prebundle the native module
    exclude: ['better-sqlite3'],
  },
});
