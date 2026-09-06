import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runApi(args) {
  return execFileAsync(process.execPath, ["scripts/api.mjs", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8"
  });
}

test("summary reports latest snapshot shape and top downloads", async () => {
  const { stdout, stderr } = await runApi(["summary", "--date", "latest"]);
  const summary = JSON.parse(stdout);

  assert.equal(stderr, "");
  assert.match(summary.snapshotDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(summary.packageCount, 15);
  assert.equal(summary.topDownloads.length, 5);
  assert.ok(summary.topDownloads.every((pkg) => Number.isInteger(pkg.lastWeekDownloads)));
});

test("package lookup returns one named package with provenance", async () => {
  const { stdout } = await runApi(["package", "eslint", "--date", "latest"]);
  const pkg = JSON.parse(stdout);

  assert.equal(pkg.name, "eslint");
  assert.match(pkg.latestVersion, /^\d+\.\d+\.\d+/);
  assert.ok(pkg.sources.registry.endsWith("/eslint"));
  assert.ok(pkg.sources.downloads.endsWith("/eslint"));
});

test("missing package exits with a clear error", async () => {
  await assert.rejects(
    runApi(["package", "definitely-not-in-this-dataset", "--date", "latest"]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /package not found: definitely-not-in-this-dataset/);
      return true;
    }
  );
});

const invalidInvocations = [
  { args: ["summary", "--date"], label: "missing date value" },
  { args: ["package"], label: "missing package name" },
  { args: ["summary", "--unknown"], label: "unknown option" },
  { args: ["summary", "extra"], label: "extra argument" },
  { args: ["package", "--date", "latest", "eslint"], label: "misordered package name" }
];

for (const { args, label } of invalidInvocations) {
  test(`${label} exits with concise usage`, async () => {
    await assert.rejects(runApi(args), (error) => {
      assert.equal(error.code, 2);
      assert.match(error.stderr, /^error: .+\nusage: node scripts\/api\.mjs summary \[--date <latest\|YYYY-MM-DD>\]/);
      assert.doesNotMatch(error.stderr, /\n\s+at |ENOENT/);
      return true;
    });
  });
}

test("unavailable snapshot date exits without a filesystem stack trace", async () => {
  await assert.rejects(runApi(["summary", "--date", "1900-01-01"]), (error) => {
    assert.equal(error.code, 1);
    assert.equal(error.stderr, "snapshot not found: 1900-01-01\n");
    assert.doesNotMatch(error.stderr, /\n\s+at |ENOENT/);
    return true;
  });
});
