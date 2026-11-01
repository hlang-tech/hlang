import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  devIndicators: false,
  // Screenshots of interfaces carry small text; they are served at a higher quality.
  images: { qualities: [75, 92] },
  // Dev and production builds must not write to the same cache.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // The workspace root, so Turbopack resolves the linked @hlang-org packages.
  turbopack: { root: path.join(__dirname, '..') },
};

export default nextConfig;
