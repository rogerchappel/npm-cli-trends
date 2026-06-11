import { readFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("..", import.meta.url);
const [command, nameOrFlag, maybeDate] = process.argv.slice(2);

function selectedDate() {
  if (nameOrFlag === "--date") return maybeDate;
  const idx = process.argv.indexOf("--date");
  return idx === -1 ? "latest" : process.argv[idx + 1];
}

async function loadSnapshot(date) {
  const file = date === "latest" ? "data/latest.json" : `data/snapshots/${date}.json`;
  return JSON.parse(await readFile(path.join(root.pathname, file), "utf8"));
}

if (!["summary", "package"].includes(command)) {
  console.error("usage: node scripts/api.mjs summary --date latest");
  console.error("   or: node scripts/api.mjs package eslint --date latest");
  process.exit(2);
}

const snapshot = await loadSnapshot(selectedDate());

if (command === "summary") {
  console.log(JSON.stringify({
    snapshotDate: snapshot.snapshotDate,
    packageCount: snapshot.packageCount,
    topDownloads: snapshot.packages
      .slice()
      .sort((a, b) => b.lastWeekDownloads - a.lastWeekDownloads)
      .slice(0, 5)
      .map((pkg) => ({ name: pkg.name, latestVersion: pkg.latestVersion, lastWeekDownloads: pkg.lastWeekDownloads }))
  }, null, 2));
}

if (command === "package") {
  const pkg = snapshot.packages.find((candidate) => candidate.name === nameOrFlag);
  if (!pkg) {
    console.error(`package not found: ${nameOrFlag}`);
    process.exit(1);
  }
  console.log(JSON.stringify(pkg, null, 2));
}
