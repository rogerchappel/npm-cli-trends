# npm-cli-trends

Daily public npm registry snapshots for widely used CLI and developer tooling packages.

The repository keeps compact, reviewable artifacts for researchers, maintainers, and agents that need stable package metadata without repeatedly calling the npm registry.

## Sources

- Registry metadata: `https://registry.npmjs.org/<package>`
- Package download counts: `https://api.npmjs.org/downloads/point/last-week/<package>`

All generated data is public npm data. Fetches are conservative and include source URLs in each snapshot.

## Tracked packages

The seed set focuses on common CLI and tooling packages:

- `typescript`
- `eslint`
- `prettier`
- `vite`
- `webpack`
- `rollup`
- `pnpm`
- `npm`
- `yarn`
- `turbo`
- `nx`
- `jest`
- `vitest`
- `tsx`
- `esbuild`

## Artifacts

- `data/snapshots/YYYY-MM-DD.json` raw daily package snapshots with provenance
- `data/latest.json` normalized latest package view
- `data/latest.csv` CSV export for simple analysis
- `data/diffs/YYYY-MM-DD.md` compact diff against the previous snapshot
- `docs/index.md` generated package index
- `reports/YYYY-MM-DD.md` run report with validation notes

## Usage

```sh
npm run fetch
npm run validate
npm test
npm run smoke
npm run release:check
node scripts/api.mjs summary --date latest
node scripts/api.mjs package eslint --date latest
```

## Runnable comparison demo

Compare tracked tools using only the checked-in snapshot—no registry calls or
API credentials are required:

```sh
npm run demo
# or choose your own tracked packages
node examples/compare-tools.mjs eslint prettier typescript
```

The demo prints the snapshot date and a table sorted by last-week downloads,
including each package's current version, license, and latest publish date. It
reads `data/latest.json`, so results are reproducible for the repository state.

## Release Candidate Checks

`npm run release:check` is the required verification path for pull requests. It
validates the checked-in JSON, CSV, docs, diff, and report artifacts, then runs a
fixture-backed API test and a summary smoke command against `data/latest.json`.

The repository is intentionally marked `private` in `package.json` because it is
a public dataset and script repo, not an npm package intended for publication.
Release review should focus on reproducible data artifacts, CI status, and
README commands rather than npm publishing.

## Limitations

Download counts are last-week point-in-time values from the npm downloads API. Dist-tags, maintainer lists, and package timestamps come from npm registry package documents.
