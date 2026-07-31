import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(
  new URL("../.github/workflows/refresh-snapshot.yml", import.meta.url),
  "utf8"
);

assert.match(workflow, /permissions:\s*\n\s+contents: write/,
  "refresh workflow must be allowed to publish its review branch");
assert.doesNotMatch(workflow, /pull-requests: write|create-pull-request/,
  "refresh workflow must not require repository PR-creation permission");
assert.match(workflow, /fetch-depth: 0/,
  "refresh workflow must fetch history before updating its persistent branch");
assert.match(workflow, /git push --set-upstream origin \"\$REVIEW_BRANCH\"/,
  "refresh workflow must publish its persistent review branch");
assert.match(workflow, /\$GITHUB_STEP_SUMMARY/,
  "refresh workflow must expose a maintainer review link");

console.log("validated refresh workflow publication fallback");
