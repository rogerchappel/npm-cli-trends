import { readFile } from "node:fs/promises";

const snapshotPath = new URL("../data/latest.json", import.meta.url);
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const requested = process.argv.slice(2);

if (requested.length === 0) {
  console.error("usage: node examples/compare-tools.mjs <package> [package ...]");
  process.exit(2);
}

const packagesByName = new Map(snapshot.packages.map((pkg) => [pkg.name, pkg]));
const missing = requested.filter((name) => !packagesByName.has(name));

if (missing.length > 0) {
  console.error(`not tracked: ${missing.join(", ")}`);
  console.error(`available: ${[...packagesByName.keys()].sort().join(", ")}`);
  process.exit(1);
}

const selected = requested
  .map((name) => packagesByName.get(name))
  .sort((a, b) => b.lastWeekDownloads - a.lastWeekDownloads);
const rows = selected
  .map((pkg) => ({
    package: pkg.name,
    version: pkg.latestVersion,
    weeklyDownloads: pkg.lastWeekDownloads.toLocaleString("en-US"),
    license: pkg.license ?? "unknown",
    published: pkg.latestPublishedAt.slice(0, 10)
  }));

console.log(`Snapshot: ${snapshot.snapshotDate}; downloads: ${selected[0].downloadsStart} to ${selected[0].downloadsEnd}`);
console.table(rows);
