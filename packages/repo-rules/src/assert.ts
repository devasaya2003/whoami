import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkApp, checkCustomStories, type Violation } from "./rules";

export function findRepoRoot(from: string): string {
  let dir = from;
  while (!existsSync(join(dir, "turbo.json"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`No turbo.json found above ${from}`);
    }
    dir = parent;
  }
  return dir;
}

export function formatViolations(violations: Violation[]): string {
  return violations
    .map((v) => `  [rule ${v.rule}] ${v.path}: ${v.message}`)
    .join("\n");
}

function throwIfAny(violations: Violation[]): void {
  if (violations.length > 0) {
    throw new Error(
      `Repo rules violated (${violations.length}):\n${formatViolations(violations)}`
    );
  }
}

/**
 * Call from an app's next.config.ts (or any startup file): the process refuses
 * to start while any repo rule is broken.
 */
export function assertRepoRules(appDir: string): void {
  throwIfAny([
    ...checkApp(appDir),
    ...checkCustomStories(findRepoRoot(appDir)),
  ]);
}

/** Rule 3 only, for non-Next hosts such as Storybook (`from` = any dir in the repo). */
export function assertCustomStories(from: string): void {
  throwIfAny(checkCustomStories(findRepoRoot(from)));
}
