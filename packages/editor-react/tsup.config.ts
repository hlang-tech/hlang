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
});
