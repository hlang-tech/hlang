/**
 * Runs every documentation example and checks its output.
 *
 * Each top-level file in content/examples is a runnable example; modules it
 * shares live in content/examples/lib. An example's expected output is the
 * `.out` file next to it, and the guides show both, so every output in the docs
 * is a real run. Pass --update to rewrite the `.out` files from a fresh run.
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const websiteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplesDir = path.join(websiteDir, 'content', 'examples');
const update = process.argv.includes('--update');

const files = (await fs.readdir(examplesDir)).filter(name => name.endsWith('.mjs')).sort();
let failed = 0;

for (const file of files) {
  const outFile = path.join(examplesDir, file.replace(/\.mjs$/, '.out'));
  let stdout;
  try {
    ({ stdout } = await run(process.execPath, [path.join(examplesDir, file)], { cwd: websiteDir }));
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${file}: exited with an error\n${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  if (update) {
    await fs.writeFile(outFile, stdout);
    console.log(`wrote ${path.relative(websiteDir, outFile)}`);
    continue;
  }
  const expected = await fs.readFile(outFile, 'utf8').catch(() => undefined);
  if (expected === undefined) {
    failed += 1;
    console.error(`FAIL ${file}: no ${path.basename(outFile)}; run with --update to create it`);
  } else if (expected !== stdout) {
    failed += 1;
    console.error(`FAIL ${file}: output differs from ${path.basename(outFile)}\n--- expected\n${expected}--- actual\n${stdout}`);
  } else {
    console.log(`ok   ${file}`);
  }
}

if (failed > 0) {
  console.error(`${String(failed)} of ${String(files.length)} examples failed`);
  process.exitCode = 1;
}
