import { readFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("..", import.meta.url);
function usage(message) {
  console.error(`error: ${message}`);
  console.error("usage: node scripts/api.mjs summary [--date <latest|YYYY-MM-DD>]");
  console.error("   or: node scripts/api.mjs package <name> [--date <latest|YYYY-MM-DD>]");
  process.exit(2);
}

function parseArguments(args) {
  const [command, ...rest] = args;
  if (!["summary", "package"].includes(command)) usage("expected summary or package command");

  let name;
  let options;
  if (command === "package") {
    [name, ...options] = rest;
    if (!name || name.startsWith("--")) usage("package requires a package name");
  } else {
    options = rest;
  }

  if (options.length === 1 && options[0] === "--date") usage("--date requires a value");
  if (options.length !== 0 && (options.length !== 2 || options[0] !== "--date")) {
    usage(`invalid arguments for ${command}`);
  }

  const date = options.length === 0 ? "latest" : options[1];
  if (date !== "latest" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    usage("date must be latest or YYYY-MM-DD");
  }
  return { command, name, date };
}

async function loadSnapshot(date) {
  const file = date === "latest" ? "data/latest.json" : `data/snapshots/${date}.json`;
  return JSON.parse(await readFile(path.join(root.pathname, file), "utf8"));
}

const { command, name, date } = parseArguments(process.argv.slice(2));
let snapshot;
try {
  snapshot = await loadSnapshot(date);
} catch (error) {
  if (error.code === "ENOENT") {
    console.error(`snapshot not found: ${date}`);
    process.exit(1);
  }
  throw error;
}

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
  const pkg = snapshot.packages.find((candidate) => candidate.name === name);
  if (!pkg) {
    console.error(`package not found: ${name}`);
    process.exit(1);
  }
  console.log(JSON.stringify(pkg, null, 2));
}
