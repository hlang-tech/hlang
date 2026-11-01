import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { compile } from '@hlang-org/compiler';
import { graph } from './lib/graph.mjs';

// Each node code becomes an import from a module you choose.
const { code, imports } = compile(graph, {
  nodes: {
    greeting: { from: './nodes.mjs', name: 'Greeting' },
    uppercase: { from: './nodes.mjs', name: 'Uppercase' },
    print: { from: './nodes.mjs', name: 'Print' },
  },
});
console.log(code);
console.log('imports:', imports.join(', '));

// Write the module next to the node classes and run it.
const dir = new URL('../../node_modules/.cache/hlang-examples/', import.meta.url);
await mkdir(dir, { recursive: true });
await copyFile(new URL('./lib/nodes.mjs', import.meta.url), new URL('nodes.mjs', dir));
await writeFile(new URL('program.mjs', dir), code);
const { run } = await import(new URL('program.mjs', dir).href);
const { dispose } = run();
dispose();
