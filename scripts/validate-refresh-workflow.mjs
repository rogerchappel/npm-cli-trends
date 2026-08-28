import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/refresh-snapshot.yml", import.meta.url),
  "utf8"
);
const contributing = await readFile(
  new URL("../CONTRIBUTING.md", import.meta.url),
  "utf8"
);

assert.match(workflow, /permissions:\s*\n\s+contents: write/,
  "refresh workflow must be allowed to publish its review branch");
assert.match(workflow, /pull-requests: write/,
  "refresh workflow must have least-privilege permission to reconcile its PR");
assert.match(workflow, /fetch-depth: 0/,
  "refresh workflow must fetch history before updating its persistent branch");
assert.match(workflow, /cp scripts\/refresh-branch\.mjs "\$RUNNER_TEMP\/refresh-branch\.mjs"/,
  "refresh helper must remain available after switching away from the workflow ref");
assert.match(workflow, /"\$RUNNER_TEMP\/refresh-branch\.mjs" prepare/,
  "refresh workflow must rebuild its persistent branch from the default branch");
assert.match(workflow, /"\$RUNNER_TEMP\/refresh-branch\.mjs" publish/,
  "refresh workflow must safely replace its persistent review branch");
assert.match(workflow, /npm run validate:freshness/,
  "refresh workflow must reject stale newly fetched artifacts");
assert.match(workflow, /node scripts\/ensure-refresh-pr\.mjs/,
  "refresh workflow must create or update its persistent pull request");

assert.match(contributing, /next scheduled or\s+`workflow_dispatch` run rebuild it from the latest `main`/,
  "maintainer recovery instructions must preserve automatic branch rebuilding");
assert.match(contributing, /Do not close its pull request or manually delete the branch/,
  "maintainer recovery instructions must not require branch or PR deletion");
assert.match(contributing, /`npm run validate` for wall-clock-independent artifact integrity/,
  "maintainer instructions must describe validate as the reproducible integrity check");
assert.match(contributing, /`npm run validate:freshness` to reject snapshots older than two UTC calendar\s+days/,
  "maintainer instructions must assign the wall-clock age gate to validate:freshness");

console.log("validated refresh workflow publication, PR reconciliation, and maintainer guidance");
