import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...options }).trim();
}

export function prepare({
  defaultBranch,
  reviewBranch,
  githubEnv = process.env.GITHUB_ENV,
  cwd
}) {
  git(["fetch", "origin", defaultBranch], { cwd, stdio: "pipe" });
  git(["update-ref", "-d", `refs/remotes/origin/${reviewBranch}`], { cwd });
  try {
    git(["fetch", "origin", `${reviewBranch}:refs/remotes/origin/${reviewBranch}`], {
      cwd,
      stdio: "pipe"
    });
  } catch {
    // The first run creates the persistent branch.
  }

  let expected = "";
  try {
    expected = git(["rev-parse", `refs/remotes/origin/${reviewBranch}`], { cwd });
  } catch {
    // An empty lease below means the remote branch must still be absent.
  }

  git(["switch", "--force-create", reviewBranch, `origin/${defaultBranch}`], { cwd });
  if (githubEnv) {
    appendFileSync(githubEnv, `REVIEW_BRANCH_EXPECTED=${expected}\n`);
  }
  return expected;
}

export function publish({ reviewBranch, expected, cwd }) {
  git([
    "push",
    `--force-with-lease=refs/heads/${reviewBranch}:${expected}`,
    "--set-upstream",
    "origin",
    `HEAD:refs/heads/${reviewBranch}`
  ], { cwd, stdio: "pipe" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command] = process.argv.slice(2);
  const reviewBranch = process.env.REVIEW_BRANCH;
  if (!reviewBranch) throw new Error("REVIEW_BRANCH is required");

  if (command === "prepare") {
    const defaultBranch = process.env.DEFAULT_BRANCH;
    if (!defaultBranch) throw new Error("DEFAULT_BRANCH is required");
    prepare({ defaultBranch, reviewBranch });
  } else if (command === "publish") {
    publish({ reviewBranch, expected: process.env.REVIEW_BRANCH_EXPECTED ?? "" });
  } else {
    throw new Error("Expected command: prepare or publish");
  }
}
