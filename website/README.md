# hlang website

The hlang website and documentation: a Next.js app in this monorepo. It is private and is not
published to npm.

## Develop

From the repository root:

```sh
pnpm install
pnpm dev:website
```

Turborepo builds the workspace packages the site imports and runs `generate` (the API reference
and the copied media) before the dev server starts. `generate` is a task of its own, so `build`,
`dev` and CI run it once and reuse its cached output.

## Source of truth

Nothing that describes the code is written by hand twice.

| Content | Source |
| --- | --- |
| API reference | TypeDoc and typedoc-plugin-markdown read each package's `src/index.ts` at build time (`scripts/generate.mjs`), one page per package. |
| Guides | Markdown in `content/docs`. Code blocks with `file=` or `output=` take their body from `content/examples`. |
| Examples | Runnable files in `content/examples`. `pnpm --filter @hlang-org/website test` runs each one and compares its output with the `.out` file next to it; `--update` rewrites them. |
| Changelog | Each package's `CHANGELOG.md`, written by Changesets. |
| Brand page | `media/brand/README.md`. |
| Images | `media/` at the repository root, copied to `public/media` at build time. |
| Versions and package list | `packages/*/package.json`. |

## Check

The site is part of the workspace gate: `pnpm check` at the root builds, typechecks, lints and
tests it with the packages.

## Deploy

The site deploys to Vercel with `website` as the project's root directory. Vercel installs the
workspace from the repository root and builds the site and the packages it depends on with
Turborepo. Set `SITE_URL` to the production origin so canonical URLs, the sitemap and social
cards use it.
