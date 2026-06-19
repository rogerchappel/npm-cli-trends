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
