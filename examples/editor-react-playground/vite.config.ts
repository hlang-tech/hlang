import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Workspace packages are linked by pnpm (`workspace:*`), so Vite resolves one
// real copy of react / @xyflow/react through the shared pnpm store. Every
// linked @hlang-org package ships an ES module entry, so none needs CommonJS
// conversion.

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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          return Object.entries(VENDOR_CHUNKS).find(([, pattern]) => pattern.test(id))?.[0];
        },
      },
    },
  },
});
