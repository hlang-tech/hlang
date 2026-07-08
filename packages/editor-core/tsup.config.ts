import { defineConfig } from 'tsup';

// Dual ESM + CJS output with type declarations. editor-core uses TypeScript
// legacy parameter decorators for its DI (experimentalDecorators). Those only
// use the parameter INDEX (no emitDecoratorMetadata / reflect-metadata), which
// esbuild supports. tsup reads experimentalDecorators from tsconfig.json.
// The sibling interpreter is external so it isn't inlined.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'lib',
  target: 'es2019',
  external: ['@hlang-org/interpreter', '@hlang-org/runtime'],
});
