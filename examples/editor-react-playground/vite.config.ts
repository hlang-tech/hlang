import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The hlang workspace packages now ship proper dual ESM+CJS (built with tsup),
// so Vite resolves their real ESM named exports and a single @xyflow/react
// instance. `dedupe` is kept as a belt-and-suspenders guard for the identity-
// sensitive singletons across the `file:`-linked packages.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  resolve: {
    dedupe: ['react', 'react-dom', '@xyflow/react', '@xyflow/system', 'zustand'],
  },
});
