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
- If the persistent branch cannot merge `main`, close its PR, delete that branch,
  and use `workflow_dispatch` to recreate it; never force-push the review branch.
- Use `npm run fetch` to refresh public npm registry and download metadata.
- Review generated diffs under `data/diffs/` before opening a pull request.
- `npm run validate` rejects snapshots older than two UTC calendar days.
- Keep the package seed set focused on widely used CLI and developer tooling packages.
- Do not hand-edit generated snapshot, CSV, index, or report artifacts unless correcting a documented generator issue.
