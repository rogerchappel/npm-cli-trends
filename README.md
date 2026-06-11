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
node scripts/api.mjs summary --date latest
node scripts/api.mjs package eslint --date latest
```

## Limitations

Download counts are last-week point-in-time values from the npm downloads API. Dist-tags, maintainer lists, and package timestamps come from npm registry package documents.
