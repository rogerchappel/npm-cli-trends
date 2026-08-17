import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/refresh-snapshot.yml", import.meta.url),
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

console.log("validated refresh workflow publication and PR reconciliation");
