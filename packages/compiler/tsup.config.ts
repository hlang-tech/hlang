import { defineConfig } from 'tsup';

// Dual ESM + CJS output with type declarations. Because package.json is
// `type: commonjs`, tsup emits `.js` for CJS and `.mjs` for ESM (explicit
// extensions avoid the "masquerading" resolution trap). Declarations are
// emitted per-format so `exports` can point types at each condition.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'lib',
  target: 'es2019',
});
