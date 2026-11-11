import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCustomStories,
  assertRepoRules,
  findRepoRoot,
  formatViolations,
} from "./assert";

function repo(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "repo-rules-assert-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("findRepoRoot", () => {
  it("walks up to the directory holding turbo.json", () => {
    const { root, cleanup } = repo({ "turbo.json": "{}", "apps/web/x.ts": "" });
    expect(findRepoRoot(join(root, "apps/web"))).toBe(root);
    cleanup();
  });

  it("throws when there is none", () => {
    const { root, cleanup } = repo({ "a/x.ts": "" });
    expect(() => findRepoRoot(join(root, "a"))).toThrow("No turbo.json found");
    cleanup();
  });
});

describe("assertRepoRules", () => {
  it("passes on a clean app", () => {
    const { root, cleanup } = repo({
      "turbo.json": "{}",
      "apps/web/page.tsx": "",
    });
    expect(() => assertRepoRules(join(root, "apps/web"))).not.toThrow();
    cleanup();
  });

  it("throws one error listing every violation", () => {
    const { root, cleanup } = repo({
      "turbo.json": "{}",
      "apps/web/server/api.ts": "",
      "packages/ui/src/components/custom/thing.tsx": "",
    });
    const run = () => assertRepoRules(join(root, "apps/web"));
    expect(run).toThrow("Repo rules violated (3)");
    expect(run).toThrow("[rule 3]");
    cleanup();
  });
});

describe("assertCustomStories", () => {
  it("only checks the story rule", () => {
    const { root, cleanup } = repo({
      "turbo.json": "{}",
      "apps/web/server/api.ts": "",
    });
    expect(() => assertCustomStories(join(root, "apps/web"))).not.toThrow();
    cleanup();
  });

  it("throws on a custom component without a story", () => {
    const { root, cleanup } = repo({
      "turbo.json": "{}",
      "packages/ui/src/components/custom/thing.tsx": "",
    });
    expect(() => assertCustomStories(root)).toThrow("missing story");
    cleanup();
  });
});

describe("formatViolations", () => {
  it("renders one line per violation", () => {
    expect(formatViolations([{ rule: 2, path: "a.ts", message: "m" }])).toBe(
      "  [rule 2] a.ts: m"
    );
  });
});
