/**
 * Decides whether a change can affect the website, so CI runs the website's
 * browser tests only when it can.
 *
 * The website builds from every package's source, renders the editor and runs
 * the engine, so "the website changed" is not limited to `website/`. The
 * decision is therefore inverted: a change skips the browser tests only when
 * every file it touches is on the list below of files the website never reads.
 * Anything else, including a file this list does not know about, runs them.
 *
 * Usage: node scripts/ci/website-affected.mjs <base> <head>
 * Prints `affected=true|false` (appended to $GITHUB_OUTPUT when it is set).
 * A failure to compute the change reports `affected=true`.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

/** Files the website build, its generated pages and its browser tests never read. */
export const UNREAD_BY_WEBSITE = [
  /^packages\/[^/]+\/test\//, // package tests and fixtures
  /^packages\/[^/]+\/(README|CHANGELOG)\.md$/, // the API pages come from source, not READMEs
  /^packages\/[^/]+\/(vitest\.config\.[cm]?[jt]s|eslint\.config\.[cm]?js|tsconfig\.test\.json|\.attw\.json)$/,
  /^examples\//, // the playground is a separate app
  /^\.changeset\//,
  /^\.github\/(?!workflows\/ci\.yml$)/, // every other workflow and repository setting
  /^scripts\/release\//,
  /^(AGENTS|CLAUDE|CODE_OF_CONDUCT|SECURITY|README|README\.zh-CN|CHANGELOG)\.md$/,
];

/** Whether a change touching `files` can affect the website. */
export function websiteAffected(files) {
  return files.some((file) => !UNREAD_BY_WEBSITE.some((pattern) => pattern.test(file)));
}

function changedFiles(base, head) {
  const output = execFileSync('git', ['diff', '--name-only', base, head, '--'], { encoding: 'utf8' });
  return output.split('\n').filter((line) => line !== '');
}

function report(affected) {
  const line = `affected=${affected}`;
  console.log(line);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [base, head] = process.argv.slice(2);
  let affected = true;
  try {
    if (base === undefined || head === undefined) {
      throw new Error('usage: website-affected.mjs <base> <head>');
    }
    const files = changedFiles(base, head);
    affected = websiteAffected(files);
    console.log(`${files.length} changed file(s); website ${affected ? 'affected' : 'not affected'}.`);
  } catch (error) {
    console.error(`Could not decide (${error instanceof Error ? error.message : String(error)}); running the browser tests.`);
  }
  report(affected);
}
