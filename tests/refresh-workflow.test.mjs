import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { prepare, publish } from "../scripts/refresh-branch.mjs";
import { ensureRefreshPullRequest } from "../scripts/ensure-refresh-pr.mjs";

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

function recordedRunner({ ahead = "1", pulls = [], createError } = {}) {
  const calls = [];
  return {
    calls,
    run(command, args) {
      calls.push([command, ...args]);
      if (command === "git") return ahead;
      if (args[1] === "list") return JSON.stringify(pulls);
      if (args[1] === "create" && createError) throw createError;
      return "";
    }
  };
}

test("refresh PR reconciliation creates the persistent PR when missing", () => {
  const runner = recordedRunner();
  const result = ensureRefreshPullRequest({
    defaultBranch: "main",
    reviewBranch: "automation/refresh-snapshot",
    run: runner.run
  });

  assert.equal(result, "created");
  assert.deepEqual(runner.calls.at(-1).slice(0, 3), ["gh", "pr", "create"]);
  assert.ok(runner.calls.at(-1).includes("automation/refresh-snapshot"));
});

test("refresh PR reconciliation preserves the branch when Actions PR creation is denied", () => {
  const createError = Object.assign(new Error("gh failed"), {
    stderr: "GraphQL: GitHub Actions is not permitted to create or approve pull requests (createPullRequest)"
  });
  const runner = recordedRunner({ createError });
  const summaries = [];
  const result = ensureRefreshPullRequest({
    defaultBranch: "main",
    reviewBranch: "automation/refresh-snapshot",
    repository: "rogerchappel/npm-cli-trends",
    stepSummary: "/tmp/summary",
    run: runner.run,
    appendSummary: (path, contents) => summaries.push([path, contents])
  });

  assert.equal(
    result,
    "manual review: https://github.com/rogerchappel/npm-cli-trends/compare/main...automation/refresh-snapshot?expand=1"
  );
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0][0], "/tmp/summary");
  assert.match(summaries[0][1], /Compare changes and open the review pull request/);
});

test("refresh PR reconciliation still fails on unrelated creation errors", () => {
  const createError = Object.assign(new Error("gh failed"), {
    stderr: "GraphQL: Resource not accessible by integration"
  });
  const runner = recordedRunner({ createError });

  assert.throws(
    () => ensureRefreshPullRequest({
      defaultBranch: "main",
      reviewBranch: "automation/refresh-snapshot",
      run: runner.run
    }),
    error => error === createError
  );
});

test("refresh PR reconciliation updates the one existing persistent PR", () => {
  const runner = recordedRunner({ pulls: [{ number: 42 }] });
  const result = ensureRefreshPullRequest({
    defaultBranch: "main",
    reviewBranch: "automation/refresh-snapshot",
    run: runner.run
  });

  assert.equal(result, "updated #42");
  assert.deepEqual(runner.calls.at(-1).slice(0, 4), ["gh", "pr", "edit", "42"]);
});

test("refresh PR reconciliation is a successful no-op without branch changes", () => {
  const runner = recordedRunner({ ahead: "0" });
  const result = ensureRefreshPullRequest({
    defaultBranch: "main",
    reviewBranch: "automation/refresh-snapshot",
    run: runner.run
  });

  assert.equal(result, "no changes");
  assert.equal(runner.calls.filter(([command]) => command === "gh").length, 0);
});

test("refresh PR reconciliation rejects duplicate open persistent PRs", () => {
  const runner = recordedRunner({ pulls: [{ number: 41 }, { number: 42 }] });
  assert.throws(
    () => ensureRefreshPullRequest({
      defaultBranch: "main",
      reviewBranch: "automation/refresh-snapshot",
      run: runner.run
    }),
    /no more than one persistent refresh PR/
  );
});
