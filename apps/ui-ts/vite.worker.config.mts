import { defineConfig } from 'vite';

// Vite config for the ML worker (runs in Node/worker_threads).
export default defineConfig({
  build: {
    target: 'node20',
    sourcemap: true,
    lib: {
      entry: 'src/mlWorker.js',
      // Ensure the emitted file is .vite/build/mlWorker.js
      fileName: 'mlWorker',
      formats: ['cjs'],
    },
    rollupOptions: {
      // Keep native deps external so their .node files load at runtime
      external: ['onnxruntime-node'],
    },
    commonjsOptions: {
      // Allow dynamic requires if deps use them
      ignoreDynamicRequires: true,
    },
  },
});
