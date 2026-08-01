import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { prepare, publish } from "../scripts/refresh-branch.mjs";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
}

function commitFile(cwd, contents, message) {
  writeFileSync(join(cwd, "generated.txt"), contents);
  git(cwd, "add", "generated.txt");
  git(cwd, "commit", "-m", message);
}

test("refresh workflow has a policy-compatible publication path", () => {
  execFileSync(process.execPath, ["scripts/validate-refresh-workflow.mjs"], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe"
  });
});

test("a conflicting persistent branch is rebuilt and safely published", () => {
  const root = mkdtempSync(join(tmpdir(), "refresh-branch-"));
  const remote = join(root, "remote.git");
  const seed = join(root, "seed");
  const runner = join(root, "runner");
  git(root, "init", "--bare", remote);
  git(root, "clone", remote, seed);
  git(seed, "config", "user.name", "Test Author");
  git(seed, "config", "user.email", "test@example.com");
  git(seed, "switch", "-c", "main");
  commitFile(seed, "base\n", "base");
  git(seed, "push", "-u", "origin", "main");
  git(seed, "switch", "-c", "automation/refresh-snapshot");
  commitFile(seed, "stale branch artifact\n", "stale refresh");
  const staleSha = git(seed, "rev-parse", "HEAD");
  git(seed, "push", "-u", "origin", "automation/refresh-snapshot");
  git(seed, "switch", "main");
  commitFile(seed, "conflicting main artifact\n", "advance main");
  const mainSha = git(seed, "rev-parse", "HEAD");
  git(seed, "push");

  git(root, "clone", remote, runner);
  git(runner, "config", "user.name", "Test Author");
  git(runner, "config", "user.email", "test@example.com");
  const expected = prepare({
    defaultBranch: "main",
    reviewBranch: "automation/refresh-snapshot",
    githubEnv: null,
    cwd: runner
  });
  assert.equal(expected, staleSha);
  assert.equal(git(runner, "rev-parse", "HEAD"), mainSha);
  assert.equal(readFileSync(join(runner, "generated.txt"), "utf8"), "conflicting main artifact\n");

  commitFile(runner, "freshly generated artifact\n", "fresh refresh");
  const refreshedSha = git(runner, "rev-parse", "HEAD");
  publish({ reviewBranch: "automation/refresh-snapshot", expected, cwd: runner });
  assert.equal(
    git(runner, "ls-remote", "origin", "refs/heads/automation/refresh-snapshot").split("\t")[0],
    refreshedSha
  );
});
