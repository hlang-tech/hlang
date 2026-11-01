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

/**
 * Third-party code that changes far less often than the app is split into
 * long-lived vendor chunks, so a release of the app does not invalidate them.
 */
const VENDOR_CHUNKS: Readonly<Record<string, RegExp>> = {
  react: /[\\/]node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?(?:react|react-dom|scheduler)[\\/]/,
  'react-flow': /[\\/]node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?(?:@xyflow|d3-[a-z-]+|zustand|classcat)[\\/]/,
  rxjs: /[\\/]node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?(?:rxjs|tslib)[\\/]/,
};

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
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          return Object.entries(VENDOR_CHUNKS).find(([, pattern]) => pattern.test(id))?.[0];
        },
      },
    },
  },
});
