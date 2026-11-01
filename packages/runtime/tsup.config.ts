import { defineConfig } from 'tsup';

// One ES module build. The runtime ships a single implementation so a program
// holds one copy of it however it loads it: `import`, or `require` (Node.js
// loads an ES module through `require` since 20.19 and 22.12). Two copies could
// not share nodes, whose engine state is private to the copy that made them.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'lib',
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
});
