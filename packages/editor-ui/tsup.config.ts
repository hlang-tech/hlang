import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'lib',
  target: 'es2019',
  external: ['react', 'react-dom', '@xyflow/react', '@xyflow/system', '@hlang-org/editor-core', '@hlang-org/editor-react', '@hlang-org/interpreter', '@hlang-org/runtime'],
  // Component CSS (`import './HlangNode.css'`) is delivered separately via
  // copyfiles + the `./tokens.css` subpath export, not bundled into the JS.
  // The `empty` loader turns these imports into no-ops so esbuild neither
  // fails on them nor emits a stray `lib/index.css`.
  loader: { '.css': 'empty' },
});
