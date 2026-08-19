# npm-cli-trends

Daily public npm registry snapshots for widely used CLI and developer tooling packages.

The repository keeps compact, reviewable artifacts for researchers, maintainers, and agents that need stable package metadata without repeatedly calling the npm registry.

## Sources

- Registry metadata: `https://registry.npmjs.org/<package>`
- Package download counts: `https://api.npmjs.org/downloads/point/last-week/<package>`

All generated data is public npm data. Fetches are conservative and include source URLs in each snapshot.

## Update cadence and freshness

A scheduled GitHub Actions run refreshes the public metadata daily at 04:17 UTC
and publishes updates to the persistent `automation/refresh-snapshot` branch.
When generated artifacts differ from `main`, the workflow creates one pull
request from that branch or updates the existing open pull request. Maintainers
review and merge that PR to publish the current snapshot on the default branch;
the workflow never writes generated data directly to `main`. A run with no
generated difference succeeds without opening an empty PR. If repository policy
prevents GitHub Actions from creating the first PR, the workflow still succeeds,
preserves the published review branch, and links a compare/new-PR page in the
run summary for a maintainer to open it manually. Later runs update that PR.

`npm run validate` checks the integrity and internal consistency of the
checked-in artifacts without consulting the wall clock, so historical
checkouts remain reproducible. The scheduled refresh separately runs
`npm run validate:freshness`, which requires newly fetched `data/latest.json`
to be no more than two UTC calendar days old. Freshness checks can use a
deterministic clock and threshold through `SNAPSHOT_NOW` and
`MAX_SNAPSHOT_AGE_DAYS`; for example:

```sh
SNAPSHOT_NOW=2026-07-18T00:00:00Z MAX_SNAPSHOT_AGE_DAYS=2 npm run validate:freshness
```

If the run summary reports that Actions could not create the first review PR,
follow its compare/new-PR link; the verified generated artifacts are already on
the persistent review branch. For other scheduled-run failures, manually run
`npm run fetch`, review the generated diff and report, then run
`npm run release:check` before opening an update PR.
If the persistent review branch has diverged from `main`, the next scheduled or
`workflow_dispatch` run automatically rebuilds it from the latest `main`,
regenerates the artifacts, and safely replaces the stale branch. Maintainers do
not need to close its pull request or delete the branch. Review the generated
dated snapshot, `data/latest.*`, report, and diff in that single PR before
merging. The workflow refuses to overwrite a concurrent branch update.
`npm run validate:automation` checks the branch publication and PR
reconciliation contract locally.

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
npm run validate:freshness
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
It deliberately omits wall-clock freshness; `npm run validate:freshness` is the
scheduled refresh gate for newly generated artifacts.

The repository is intentionally marked `private` in `package.json` because it is
a public dataset and script repo, not an npm package intended for publication.
Release review should focus on reproducible data artifacts, CI status, and
README commands rather than npm publishing.

## Limitations

Download counts are last-week point-in-time values from the npm downloads API. Dist-tags, maintainer lists, and package timestamps come from npm registry package documents.
