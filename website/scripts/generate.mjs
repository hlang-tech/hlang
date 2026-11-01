/**
 * Build-time generation from source: nothing in the API reference is written
 * by hand. TypeDoc reads each package's public entry point (exports, types and
 * TSDoc comments) and typedoc-plugin-markdown writes one Markdown page per
 * package, which the site renders with the same pipeline as the guides.
 *
 * It also copies the repository's media/ images into public/media, so the site
 * serves the repository's own files, and records which files it copied.
 *
 * Output: .generated/api/<package>/index.md, .generated/api/manifest.json,
 * public/media/**, .generated/media.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Application, LogLevel } from 'typedoc';

const websiteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(websiteDir, '..');
const packagesDir = path.join(repoDir, 'packages');
const outDir = path.join(websiteDir, '.generated', 'api');

export const API_PACKAGES = ['runtime', 'ir', 'interpreter', 'compiler', 'editor-core', 'editor-react', 'editor-ui'];

async function generateApi(short) {
  const packageDir = path.join(packagesDir, short);
  const packageJson = JSON.parse(await fs.readFile(path.join(packageDir, 'package.json'), 'utf8'));
  const out = path.join(outDir, short);
  const app = await Application.bootstrapWithPlugins({
    plugin: ['typedoc-plugin-markdown'],
    entryPoints: [path.join(packageDir, 'src', 'index.ts')],
    tsconfig: path.join(packageDir, 'tsconfig.json'),
    basePath: repoDir,
    out,
    readme: 'none',
    excludePrivate: true,
    excludeProtected: true,
    excludeInternal: true,
    excludeExternals: true,
    skipErrorChecking: true,
    // "Defined in" links point at the source line on GitHub.
    sourceLinkTemplate: 'https://github.com/hlang-tech/hlang/blob/main/{path}#L{line}',
    // typedoc-plugin-markdown: one page per package, signatures as code blocks.
    router: 'module',
    entryFileName: 'index',
    hidePageHeader: true,
    hideBreadcrumbs: true,
    hidePageTitle: true,
    useCodeBlocks: true,
    parametersFormat: 'table',
    interfacePropertiesFormat: 'table',
    classPropertiesFormat: 'table',
    typeDeclarationFormat: 'table',
    enumMembersFormat: 'table',
    logLevel: LogLevel.Error,
  });
  const project = await app.convert();
  if (project === undefined) {
    throw new Error(`typedoc: could not convert ${short}`);
  }
  await fs.rm(out, { recursive: true, force: true });
  await app.generateOutputs(project);
  return {
    short,
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description ?? '',
    exports: project.children?.length ?? 0,
  };
}

/** Image files under media/ that the site serves, by extension. */
const MEDIA_FILE = /\.(svg|png|jpg|webp)$/;

/** Every image file under `dir`, as repository-relative paths. */
async function mediaFiles(dir) {
  const entries = await fs.readdir(path.join(repoDir, dir), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => (entry.isDirectory() ? mediaFiles(`${dir}/${entry.name}`) : Promise.resolve(MEDIA_FILE.test(entry.name) ? [`${dir}/${entry.name}`] : []))),
  );
  return nested.flat();
}

/**
 * The site serves the repository's media/ directory as /media: the logo, the
 * brand files, the case covers and the editor screenshots exist once, in
 * media/, and are copied here at build time. The map from repository path to
 * served path lets Markdown from the repository (the brand README) resolve its
 * relative images.
 */
async function copyMedia() {
  const publicDir = path.join(websiteDir, 'public', 'media');
  await fs.rm(publicDir, { recursive: true, force: true });
  const assets = {};
  for (const source of await mediaFiles('media')) {
    const served = `/${source}`;
    await fs.mkdir(path.dirname(path.join(websiteDir, 'public', served)), { recursive: true });
    await fs.copyFile(path.join(repoDir, source), path.join(websiteDir, 'public', served));
    assets[source] = served;
  }
  await fs.mkdir(path.join(websiteDir, '.generated'), { recursive: true });
  await fs.writeFile(path.join(websiteDir, '.generated', 'media.json'), `${JSON.stringify(assets, null, 2)}\n`);
  return Object.keys(assets).length;
}

await fs.mkdir(outDir, { recursive: true });
console.log(`media: ${String(await copyMedia())} files`);
const manifest = [];
for (const short of API_PACKAGES) {
  const entry = await generateApi(short);
  manifest.push(entry);
  console.log(`api: ${short} (${String(entry.exports)} exports)`);
}
await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
