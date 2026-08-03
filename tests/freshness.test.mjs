import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

import { assertSnapshotFresh } from "../scripts/freshness.mjs";

const now = "2026-07-25T10:36:00.000Z";
const root = new URL("..", import.meta.url);

function runNpm(script, env = {}) {
  return execFileSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: "pipe"
  });
}

test("artifact validation accepts an old but internally consistent checkout", () => {
  assert.match(
    runNpm("validate", { SNAPSHOT_NOW: "2099-01-01T00:00:00Z" }),
    /validated \d+ packages/
  );
});

test("refresh freshness validation rejects stale generated output", () => {
  assert.throws(
    () => runNpm("validate:freshness", {
      SNAPSHOT_NOW: "2099-01-01T00:00:00Z",
      MAX_SNAPSHOT_AGE_DAYS: "2"
    }),
    (error) => {
      assert.match(error.stderr, /is \d+ days old; maximum is 2 days/);
      return true;
    }
  );
});

test("accepts a snapshot within the configured freshness window", () => {
  assert.doesNotThrow(() => {
    assertSnapshotFresh("2026-07-23", { now, maxAgeDays: 2 });
  });
});

test("rejects a snapshot older than the configured freshness window", () => {
  assert.throws(
    () => assertSnapshotFresh("2026-07-22", { now, maxAgeDays: 2 }),
    /is 3 days old; maximum is 2 days/
  );
});

test("rejects malformed and impossible snapshot dates", () => {
  assert.throws(
    () => assertSnapshotFresh("July 25, 2026", { now }),
    /must be YYYY-MM-DD/
  );
  assert.throws(
    () => assertSnapshotFresh("2026-02-30", { now }),
    /not a valid calendar date/
  );
});
