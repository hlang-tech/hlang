import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  devIndicators: false,
  // The repository's own AGENTS.md is the rule set; do not generate another one here.
  agentRules: false,
  // Screenshots of interfaces carry small text; they are served at a higher quality.
  images: { qualities: [75, 92] },
  // The workspace root, so Turbopack resolves the linked @hlang-org packages.
  turbopack: { root: path.join(__dirname, '..') },
};

export default nextConfig;
