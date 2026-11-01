/**
 * Copy every stylesheet from src/ to lib/, keeping its path, so that
 * lib/styles.css can import the component stylesheets it aggregates.
 */

import { copyFile, glob, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let count = 0;
for await (const file of glob('**/*.css', { cwd: path.join(root, 'src') })) {
  const target = path.join(root, 'lib', file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, 'src', file), target);
  count += 1;
}
console.log(`copied ${String(count)} stylesheets to lib/`);
