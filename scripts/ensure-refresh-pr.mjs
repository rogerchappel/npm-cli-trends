import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const title = "data: refresh npm CLI trends snapshot";
const body = `## Automated snapshot refresh

This persistent pull request is created and updated by the daily snapshot workflow.

Review the generated data, report, and diff before merging. The workflow rebuilds this branch from the latest default branch on every run.`;
const notificationTitle = "Snapshot refresh requires a maintainer-created pull request";
const notificationMarker = "<!-- snapshot-refresh-policy-notification -->";

function execute(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: "pipe" }).trim();
}

function isActionsPullRequestPolicyError(error) {
  const diagnostic = [error?.message, error?.stderr, error?.stdout]
    .filter(Boolean)
    .join("\n");
  return diagnostic.includes("GitHub Actions is not permitted to create or approve pull requests")
    && diagnostic.includes("createPullRequest");
}

export function ensureRefreshPullRequest({
  defaultBranch,
  reviewBranch,
  repository = process.env.GITHUB_REPOSITORY,
  stepSummary = process.env.GITHUB_STEP_SUMMARY,
  run = execute,
  appendSummary = appendFileSync
}) {
  const ahead = Number(run("git", [
    "rev-list",
    "--count",
    `origin/${defaultBranch}..HEAD`
  ]));
  if (!Number.isInteger(ahead) || ahead < 0) {
    throw new Error("Unable to determine whether the refresh branch has changes");
  }
  if (ahead === 0) {
    console.log("No snapshot changes; no pull request update required.");
    return "no changes";
  }

  const pulls = JSON.parse(run("gh", [
    "pr", "list",
    "--state", "open",
    "--base", defaultBranch,
    "--head", reviewBranch,
    "--json", "number"
  ]));
  if (!Array.isArray(pulls) || pulls.length > 1) {
    throw new Error("Expected no more than one persistent refresh PR");
  }

  if (pulls.length === 1) {
    const number = String(pulls[0].number);
    run("gh", ["pr", "edit", number, "--title", title, "--body", body]);
    console.log(`Updated persistent refresh PR #${number}.`);
    return `updated #${number}`;
  }

  try {
    run("gh", [
      "pr", "create",
      "--base", defaultBranch,
      "--head", reviewBranch,
      "--title", title,
      "--body", body
    ]);
  } catch (error) {
    if (!isActionsPullRequestPolicyError(error)) throw error;
    if (!repository || !stepSummary) {
      throw new Error("GITHUB_REPOSITORY and GITHUB_STEP_SUMMARY are required for the pull-request policy fallback", { cause: error });
    }
    const reviewUrl = `https://github.com/${repository}/compare/${defaultBranch}...${reviewBranch}?expand=1`;
    const issueBody = `${notificationMarker}\n\nGitHub Actions published fresh generated snapshot changes to \`${reviewBranch}\`, but repository policy prevents the workflow from creating the first pull request.\n\n[Compare the exact changes and open the review pull request](${reviewUrl})\n\nThis issue is updated by later refreshes until a pull request exists.`;
    const notifications = JSON.parse(run("gh", [
      "issue", "list",
      "--state", "open",
      "--search", `in:body ${notificationMarker}`,
      "--json", "number"
    ]));
    if (!Array.isArray(notifications) || notifications.length > 1) {
      throw new Error("Expected no more than one open refresh policy notification");
    }
    let notification;
    if (notifications.length === 1) {
      const number = String(notifications[0].number);
      run("gh", ["issue", "edit", number, "--title", notificationTitle, "--body", issueBody]);
      notification = `updated issue #${number}`;
    } else {
      run("gh", ["issue", "create", "--title", notificationTitle, "--body", issueBody]);
      notification = "created issue";
    }
    const summary = `## Snapshot review branch published\n\nGitHub Actions cannot create pull requests under this repository's policy. The generated changes remain on \`${reviewBranch}\`, and a durable maintainer notification was ${notification}.\n\n[Compare changes and open the review pull request](${reviewUrl})\n`;
    appendSummary(stepSummary, summary);
    console.log(`Review branch preserved; ${notification}: ${reviewUrl}`);
    return `${notification}: ${reviewUrl}`;
  }
  console.log("Created persistent refresh PR.");
  return "created";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const defaultBranch = process.env.DEFAULT_BRANCH;
  const reviewBranch = process.env.REVIEW_BRANCH;
  if (!defaultBranch) throw new Error("DEFAULT_BRANCH is required");
  if (!reviewBranch) throw new Error("REVIEW_BRANCH is required");
  ensureRefreshPullRequest({ defaultBranch, reviewBranch });
}
