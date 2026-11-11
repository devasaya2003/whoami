import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkAll, checkApp, checkCustomStories } from "./rules";

const roots: string[] = [];

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "repo-rules-"));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const messages = (root: string) =>
  checkApp(root).map((v) => `${v.rule}|${v.path}|${v.message}`);

const GOOD: Record<string, string> = {
  "db/schema/tables/items.ts":
    'import { pgTable } from "drizzle-orm/pg-core";\nimport { x } from "../lib/x";\nexport const items = pgTable("items", {});',
  "db/schema/lib/x.ts": "export const x = 1;",
  "db/repositories/items.repository.ts":
    'import { items } from "../schema/tables/items";\nimport { eq } from "drizzle-orm";\nexport const r = [items, eq];',
  "db/repositories/items.repository.test.ts": "",
  "db/services/items.service.ts":
    'import { r } from "../repositories/items.repository";\nimport { z } from "zod";\nexport const s = [r, z];',
  "db/services/items.service.test.ts": "",
  "db/routers/items.router.ts":
    'import { s } from "@/db/services/items.service";\nimport { Elysia } from "elysia";\nexport const router = [s, Elysia];',
  "db/routers/items.router.test.ts": "",
};

describe("rule 1 and 2: backend structure", () => {
  it("ignores apps without a backend", () => {
    expect(checkApp(fixture({ "app/page.tsx": "" }))).toEqual([]);
  });

  it("accepts the canonical layout", () => {
    expect(messages(fixture(GOOD))).toEqual([]);
  });

  it("treats drizzle.config.ts or app/api as a backend and requires db/schema", () => {
    expect(messages(fixture({ "drizzle.config.ts": "" }))).toEqual([
      "1|db/schema|db/schema/ is required",
    ]);
    expect(messages(fixture({ "app/api/route.ts": "" }))).toHaveLength(1);
  });

  it("rejects misplaced backend directories", () => {
    const found = messages(
      fixture({ ...GOOD, "server/api.ts": "", "services/x.ts": "" })
    );
    expect(found).toContain(
      "1|server|backend code lives in db/{schema,repositories,services,routers}, not server/"
    );
    expect(found.some((m) => m.startsWith("1|services|"))).toBe(true);
  });

  it("rejects loose files and unknown directories in db/", () => {
    const found = messages(
      fixture({ ...GOOD, "db/utils.ts": "", "db/helpers/a.ts": "" })
    );
    expect(found).toContain(
      "1|db/utils.ts|db/ may only contain schema, repositories, services, routers"
    );
    expect(found).toContain(
      "1|db/helpers|db/ may only contain schema, repositories, services, routers"
    );
  });

  it("rejects layer files in the wrong directory", () => {
    const found = messages(
      fixture({
        ...GOOD,
        "db/schema/a.service.ts": "",
        "db/services/b.router.ts": "",
      })
    );
    expect(found).toContain(
      "1|db/schema/a.service.ts|*.service.ts files belong in db/services/"
    );
    expect(found).toContain(
      "1|db/services/b.router.ts|*.router.ts files belong in db/routers/"
    );
  });

  it("rejects subdirectories and badly named files inside layers", () => {
    const found = messages(
      fixture({
        ...GOOD,
        "db/repositories/nested/a.repository.ts": "",
        "db/repositories/BadName.repository.ts": "",
        "db/routers/helpers.ts": "",
      })
    );
    expect(found).toContain(
      "1|db/repositories/nested|repositories/ must be flat; remove the subdirectory"
    );
    expect(
      found.some((m) =>
        m.includes("BadName.repository.ts|files in repositories/")
      )
    ).toBe(true);
    expect(found.some((m) => m.includes("helpers.ts|files in routers/"))).toBe(
      true
    );
  });

  it("requires a test for every layer file and a source for every test", () => {
    const found = messages(
      fixture({
        ...GOOD,
        "db/services/lonely.service.ts": "",
        "db/routers/ghost.router.test.ts": "",
      })
    );
    expect(found).toContain(
      "2|db/services/lonely.service.ts|missing test file lonely.service.test.ts"
    );
    expect(found).toContain(
      "2|db/routers/ghost.router.test.ts|test has no source file ghost.router.ts"
    );
  });

  it("enforces import direction between layers", () => {
    const found = messages(
      fixture({
        ...GOOD,
        "db/repositories/items.repository.ts":
          'import { s } from "../services/items.service";\nexport const r = s;',
        "db/routers/items.router.ts":
          'import { items } from "../schema/tables/items";\nexport const r = items;',
      })
    );
    expect(
      found.some((m) =>
        m.includes("repositories/ may not import from services/")
      )
    ).toBe(true);
    expect(
      found.some((m) => m.includes("routers/ may not import from schema/"))
    ).toBe(true);
  });

  it("keeps layers inside db/ and checks schema files too", () => {
    const found = messages(
      fixture({
        ...GOOD,
        "db/schema/tables/items.ts":
          'import { a } from "../../../lib/a";\nimport { b } from "@/lib/b";\nexport const items = [a, b];',
      })
    );
    expect(found.filter((m) => m.includes("reaches outside db/"))).toHaveLength(
      2
    );
  });

  it("limits drizzle-orm, elysia and composition-root imports to their layer", () => {
    const found = messages(
      fixture({
        ...GOOD,
        "db/services/items.service.ts":
          'import { eq } from "drizzle-orm/pg-core";\nimport { Elysia } from "elysia";\nimport { putObject } from "@repo/storage";\nexport const s = [eq, Elysia, putObject];',
        "db/repositories/items.repository.ts":
          'import { Elysia } from "elysia";\nexport const r = Elysia;',
      })
    );
    expect(
      found.some((m) =>
        m.includes(
          "drizzle-orm belongs in schema/ and repositories/, not services/"
        )
      )
    ).toBe(true);
    expect(found.filter((m) => m.includes("belongs in routers/"))).toHaveLength(
      2
    );
    expect(
      found.some((m) => m.includes('"@repo/storage" is created once'))
    ).toBe(true);
  });
});

describe("rule 4: API-first pages", () => {
  const pkg = (extra: object = { repoRules: { apiFirst: true } }) =>
    JSON.stringify({ name: "x", version: "0.1.0", ...extra });
  const GOOD_API_FIRST: Record<string, string> = {
    "package.json": pkg(),
    "app/page.tsx": "",
    "app/changelog/page.tsx": "",
    "app/docs/page.tsx": "",
    "CHANGELOG.md": "# Changelog\n\n## 0.1.0 — 2026-10-26\n\n- first\n",
    "docs/api-snapshot.json": JSON.stringify({ version: "0.1.0", routes: [] }),
  };

  it("ignores apps that did not opt in", () => {
    expect(messages(fixture({ "package.json": pkg({}) }))).toEqual([]);
    expect(
      messages(
        fixture({ "package.json": pkg({ repoRules: { apiFirst: false } }) })
      )
    ).toEqual([]);
  });

  it("accepts an app with the pages, a changelog entry and a matching snapshot", () => {
    expect(messages(fixture(GOOD_API_FIRST))).toEqual([]);
    const bracketed = {
      ...GOOD_API_FIRST,
      "CHANGELOG.md": "## [0.1.0] - 2026-10-26\n",
    };
    expect(messages(fixture(bracketed))).toEqual([]);
  });

  it("requires the landing, changelog and docs pages", () => {
    const {
      "app/changelog/page.tsx": _c,
      "app/docs/page.tsx": _d,
      ...rest
    } = GOOD_API_FIRST;
    expect(messages(fixture(rest)).map((m) => m.split("|")[1])).toEqual([
      "app/changelog/page.tsx",
      "app/docs/page.tsx",
    ]);
  });

  it("requires a changelog entry for the current version only", () => {
    const { "CHANGELOG.md": _removed, ...missing } = GOOD_API_FIRST;
    expect(messages(fixture(missing))).toEqual([
      '4|CHANGELOG.md|needs an entry headed "## 0.1.0"',
    ]);
    const stale = {
      ...GOOD_API_FIRST,
      "CHANGELOG.md": "## 0.0.9\n\n## 0a1b0\n",
    };
    expect(messages(fixture(stale))).toEqual([
      '4|CHANGELOG.md|needs an entry headed "## 0.1.0"',
    ]);
  });

  it("requires a snapshot made for the current version", () => {
    const { "docs/api-snapshot.json": _removed, ...missing } = GOOD_API_FIRST;
    expect(messages(fixture(missing))).toEqual([
      '4|docs/api-snapshot.json|is missing; run "bun run docs:snapshot"',
    ]);
    for (const content of ["not json", JSON.stringify({ version: "0.0.9" })]) {
      const bad = { ...GOOD_API_FIRST, "docs/api-snapshot.json": content };
      expect(messages(fixture(bad))).toEqual([
        '4|docs/api-snapshot.json|is not for version 0.1.0; run "bun run docs:snapshot"',
      ]);
    }
  });
});

describe("rule 3: custom component stories", () => {
  const component = "export function Thing() { return null; }";
  const goodStory =
    'import { Thing } from "@repo/ui/components/custom/thing";\nconst meta = { title: "Custom/Thing", component: Thing };\nexport default meta;\nexport const Default = {};';
  const components = "packages/ui/src/components/custom";
  const stories = "apps/docs/stories/custom";

  it("passes when there is nothing custom", () => {
    expect(checkCustomStories(fixture({}))).toEqual([]);
  });

  it("accepts a real story", () => {
    const root = fixture({
      [`${components}/thing.tsx`]: component,
      [`${components}/README.md`]: "",
      [`${stories}/thing.stories.tsx`]: goodStory,
    });
    expect(checkCustomStories(root)).toEqual([]);
  });

  it("requires a story file", () => {
    const root = fixture({ [`${components}/thing.tsx`]: component });
    expect(checkCustomStories(root).map((v) => v.message)).toEqual([
      "missing story apps/docs/stories/custom/thing.stories.tsx",
    ]);
  });

  it("rejects stub stories that miss any required part", () => {
    const root = fixture({
      [`${components}/thing.tsx`]: component,
      [`${stories}/thing.stories.tsx`]: "// TODO",
    });
    expect(checkCustomStories(root).map((v) => v.message)).toEqual([
      "must import @repo/ui/components/custom/thing",
      "must default-export the story meta",
      "meta must set a title",
      "must export at least one story (export const Name = ...)",
    ]);
  });

  it("rejects stories without a component", () => {
    const root = fixture({ [`${stories}/ghost.stories.tsx`]: goodStory });
    expect(checkCustomStories(root)).toHaveLength(1);
  });
});

describe("checkAll", () => {
  it("checks every Next app under apps/, and skips non-Next apps", () => {
    const root = fixture({
      "apps/web/next.config.ts": "",
      "apps/web/server/api.ts": "",
      "apps/docs/server/api.ts": "",
      "apps/notes.txt": "",
    });
    expect(
      checkAll(root)
        .map((v) => v.path)
        .sort()
    ).toEqual(["apps/web/db/schema", "apps/web/server"]);
  });
});
