import { defineConfig } from 'tsup';

// The ES module build. The CommonJS build is tsc's output in lib/ (see the
// `build` script), unchanged so that `require` and deep `lib/...` imports keep
// working; this adds lib/index.mjs and its declarations next to it. The two
// builds share no state: nodes are told apart by their `type`, not by class
// identity, so a program that loads both still works.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'lib',
  outExtension: () => ({ js: '.mjs' }),
  dts: true,
  clean: false,
  sourcemap: true,
  target: 'es2019',
});
