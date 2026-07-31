import { execFileSync } from "node:child_process";
import { test } from "node:test";

test("refresh workflow has a policy-compatible publication path", () => {
  execFileSync(process.execPath, ["scripts/validate-refresh-workflow.mjs"], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe"
  });
});
