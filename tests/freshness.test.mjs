import assert from "node:assert/strict";
import { test } from "node:test";

import { assertSnapshotFresh } from "../scripts/freshness.mjs";

const now = "2026-07-25T10:36:00.000Z";

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
