import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Workspace packages are linked by pnpm (`workspace:*`), so Vite resolves one
// real copy of react / @xyflow/react through the shared pnpm store.
//
// `@hlang-org/runtime` is the one linked package that ships CommonJS only (its
// tsc build predates the dual ESM+CJS packaging of the newer packages). Vite
// converts CommonJS only for dependencies inside node_modules, so a linked CJS
// package must be opted in explicitly — the documented setup for linked
// dependencies: https://vite.dev/guide/dep-pre-bundling#monorepos-and-linked-dependencies
const LINKED_CJS_PACKAGES = ['@hlang-org/runtime'];

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  optimizeDeps: {
    include: LINKED_CJS_PACKAGES,
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages[\\/]runtime[\\/]lib/],
    },
  },
});
