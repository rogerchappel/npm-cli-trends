import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = new URL("..", import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const latest = JSON.parse(await readFile(path.join(root.pathname, "data", "latest.json"), "utf8"));
assert(Array.isArray(latest.packages), "packages must be an array");
assert(latest.packageCount === latest.packages.length, "packageCount must match packages length");

const names = new Set();
for (const pkg of latest.packages) {
  assert(pkg.name && typeof pkg.name === "string", "package name is required");
  assert(!names.has(pkg.name), `duplicate package ${pkg.name}`);
  names.add(pkg.name);
  assert(pkg.latestVersion && typeof pkg.latestVersion === "string", `${pkg.name} latestVersion is required`);
  assert(Number.isInteger(pkg.lastWeekDownloads), `${pkg.name} lastWeekDownloads must be an integer`);
  assert(pkg.sources?.registry?.startsWith("https://registry.npmjs.org/"), `${pkg.name} registry provenance is required`);
  assert(pkg.sources?.downloads?.startsWith("https://api.npmjs.org/downloads/point/last-week/"), `${pkg.name} downloads provenance is required`);
}

const snapshotFiles = await readdir(path.join(root.pathname, "data", "snapshots"));
assert(snapshotFiles.includes(`${latest.snapshotDate}.json`), "latest snapshot must have dated copy");

const csv = await readFile(path.join(root.pathname, "data", "latest.csv"), "utf8");
assert(csv.startsWith("name,latestVersion,lastWeekDownloads,"), "latest.csv header changed unexpectedly");

console.log(`validated ${latest.packages.length} packages for ${latest.snapshotDate}`);
