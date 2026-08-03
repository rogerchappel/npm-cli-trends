import { readFile } from "node:fs/promises";

import { assertSnapshotFresh } from "./freshness.mjs";

const latest = JSON.parse(await readFile(
  new URL("../data/latest.json", import.meta.url),
  "utf8"
));
const now = process.env.SNAPSHOT_NOW || new Date();
const maxAgeDays = Number(process.env.MAX_SNAPSHOT_AGE_DAYS || 2);

assertSnapshotFresh(latest.snapshotDate, { now, maxAgeDays });
console.log(`validated snapshot freshness for ${latest.snapshotDate}`);
