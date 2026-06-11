import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const packages = [
  "typescript",
  "eslint",
  "prettier",
  "vite",
  "webpack",
  "rollup",
  "pnpm",
  "npm",
  "yarn",
  "turbo",
  "nx",
  "jest",
  "vitest",
  "tsx",
  "esbuild"
];

const root = new URL("..", import.meta.url);
const today = process.env.SNAPSHOT_DATE || new Date().toISOString().slice(0, 10);

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "npm-cli-trends/0.1 (+https://github.com/rogerchappel/npm-cli-trends)"
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

function pickLatest(registry) {
  const latestVersion = registry["dist-tags"]?.latest;
  const latest = latestVersion ? registry.versions?.[latestVersion] : undefined;
  return {
    name: registry.name,
    description: registry.description || "",
    latestVersion,
    license: latest?.license || registry.license || "",
    homepage: latest?.homepage || registry.homepage || "",
    repository: normalizeRepository(latest?.repository || registry.repository),
    distTags: registry["dist-tags"] || {},
    createdAt: registry.time?.created || null,
    modifiedAt: registry.time?.modified || null,
    latestPublishedAt: latestVersion ? registry.time?.[latestVersion] || null : null,
    maintainers: Array.isArray(registry.maintainers)
      ? registry.maintainers.map((maintainer) => maintainer.name).filter(Boolean).sort()
      : [],
    keywords: Array.isArray(latest?.keywords) ? latest.keywords.slice().sort() : [],
    bin: latest?.bin || null,
    unpackedSize: latest?.dist?.unpackedSize || null
  };
}

function normalizeRepository(repository) {
  if (!repository) return "";
  if (typeof repository === "string") return repository;
  return repository.url || "";
}

function asCsv(rows) {
  const header = [
    "name",
    "latestVersion",
    "lastWeekDownloads",
    "modifiedAt",
    "latestPublishedAt",
    "license",
    "repository"
  ];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [header.join(","), ...rows.map((row) => header.map((key) => escape(row[key])).join(","))].join("\n") + "\n";
}

function diffRows(previous, current) {
  if (!previous) return ["Initial snapshot; no previous daily snapshot found."];
  const previousByName = new Map(previous.packages.map((pkg) => [pkg.name, pkg]));
  const lines = [];
  for (const pkg of current.packages) {
    const old = previousByName.get(pkg.name);
    if (!old) {
      lines.push(`- ${pkg.name}: added at ${pkg.latestVersion}`);
      continue;
    }
    const changes = [];
    if (old.latestVersion !== pkg.latestVersion) changes.push(`latest ${old.latestVersion} -> ${pkg.latestVersion}`);
    if (old.modifiedAt !== pkg.modifiedAt) changes.push(`modified ${old.modifiedAt} -> ${pkg.modifiedAt}`);
    if (old.lastWeekDownloads !== pkg.lastWeekDownloads) {
      const delta = Number(pkg.lastWeekDownloads || 0) - Number(old.lastWeekDownloads || 0);
      changes.push(`downloads ${old.lastWeekDownloads} -> ${pkg.lastWeekDownloads} (${delta >= 0 ? "+" : ""}${delta})`);
    }
    if (changes.length) lines.push(`- ${pkg.name}: ${changes.join("; ")}`);
  }
  return lines.length ? lines : ["No package metadata or last-week download changes detected."];
}

async function readPreviousSnapshot() {
  const dir = path.join(root.pathname, "data", "snapshots");
  if (!existsSync(dir)) return null;
  const latestPath = path.join(root.pathname, "data", "latest.json");
  if (!existsSync(latestPath)) return null;
  return JSON.parse(await readFile(latestPath, "utf8"));
}

await mkdir(path.join(root.pathname, "data", "snapshots"), { recursive: true });
await mkdir(path.join(root.pathname, "data", "diffs"), { recursive: true });
await mkdir(path.join(root.pathname, "docs"), { recursive: true });
await mkdir(path.join(root.pathname, "reports"), { recursive: true });

const rows = [];
const errors = [];

for (const name of packages) {
  try {
    const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
    const downloadsUrl = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`;
    const [registry, downloads] = await Promise.all([getJson(registryUrl), getJson(downloadsUrl)]);
    rows.push({
      ...pickLatest(registry),
      lastWeekDownloads: downloads.downloads ?? null,
      downloadsStart: downloads.start ?? null,
      downloadsEnd: downloads.end ?? null,
      sources: { registry: registryUrl, downloads: downloadsUrl }
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
  } catch (error) {
    errors.push({ name, error: error.message });
  }
}

rows.sort((a, b) => a.name.localeCompare(b.name));

const snapshot = {
  snapshotDate: today,
  generatedAt: new Date().toISOString(),
  packageCount: rows.length,
  errorCount: errors.length,
  packages: rows,
  errors
};

const previous = await readPreviousSnapshot();
const diff = diffRows(previous, snapshot);

await writeFile(path.join(root.pathname, "data", "snapshots", `${today}.json`), JSON.stringify(snapshot, null, 2) + "\n");
await writeFile(path.join(root.pathname, "data", "latest.json"), JSON.stringify(snapshot, null, 2) + "\n");
await writeFile(path.join(root.pathname, "data", "latest.csv"), asCsv(rows));
await writeFile(
  path.join(root.pathname, "data", "diffs", `${today}.md`),
  `# npm CLI trends diff for ${today}\n\n${diff.join("\n")}\n`
);
await writeFile(
  path.join(root.pathname, "docs", "index.md"),
  `# Package Index\n\nGenerated from public npm registry metadata on ${today}.\n\n` +
    rows.map((pkg) => `- **${pkg.name}** ${pkg.latestVersion} - ${pkg.lastWeekDownloads} last-week downloads - ${pkg.sources.registry}`).join("\n") +
    "\n"
);
await writeFile(
  path.join(root.pathname, "reports", `${today}.md`),
  `# Run Report ${today}\n\n` +
    `- Packages requested: ${packages.length}\n` +
    `- Packages captured: ${rows.length}\n` +
    `- Source errors: ${errors.length}\n` +
    `- Registry source: https://registry.npmjs.org/<package>\n` +
    `- Download source: https://api.npmjs.org/downloads/point/last-week/<package>\n\n` +
    `## Diff\n\n${diff.join("\n")}\n` +
    (errors.length ? `\n## Errors\n\n${errors.map((err) => `- ${err.name}: ${err.error}`).join("\n")}\n` : "")
);

if (errors.length) {
  process.exitCode = 1;
}
