# Contributing

Thanks for helping improve `npm-cli-trends`.

## Local Verification

```bash
npm run release:check
```

This validates the checked-in data artifacts and runs a summary smoke command
against the latest snapshot.

## Data Updates

- A daily scheduled workflow updates the persistent
  `automation/refresh-snapshot` review branch and puts its compare/PR link in
  the run summary; generated data is never committed directly to `main`.
- PR creation permission for GitHub Actions is not required. Maintainers open
  the linked comparison once, after which scheduled pushes update that PR.
- If the persistent branch diverges from `main`, let the next scheduled or
  `workflow_dispatch` run rebuild it from the latest `main` and safely replace
  the stale branch. Do not close its pull request or manually delete the branch;
  the workflow refuses to overwrite a concurrent branch update.
- Use `npm run fetch` to refresh public npm registry and download metadata.
- Review generated diffs under `data/diffs/` before opening a pull request.
- Use `npm run validate` for wall-clock-independent artifact integrity and
  internal consistency checks. The scheduled refresh separately runs
  `npm run validate:freshness` to reject snapshots older than two UTC calendar
  days.
- Keep the package seed set focused on widely used CLI and developer tooling packages.
- Do not hand-edit generated snapshot, CSV, index, or report artifacts unless correcting a documented generator issue.
