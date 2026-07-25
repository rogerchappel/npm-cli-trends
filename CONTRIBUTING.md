# Contributing

Thanks for helping improve `npm-cli-trends`.

## Local Verification

```bash
npm run release:check
```

This validates the checked-in data artifacts and runs a summary smoke command
against the latest snapshot.

## Data Updates

- A daily scheduled workflow opens or updates a review branch; generated data is
  never committed directly to `main`.
- Use `npm run fetch` to refresh public npm registry and download metadata.
- Review generated diffs under `data/diffs/` before opening a pull request.
- `npm run validate` rejects snapshots older than two UTC calendar days.
- Keep the package seed set focused on widely used CLI and developer tooling packages.
- Do not hand-edit generated snapshot, CSV, index, or report artifacts unless correcting a documented generator issue.
