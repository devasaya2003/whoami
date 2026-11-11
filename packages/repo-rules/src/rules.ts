import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

export interface Violation {
  /** 1 = backend structure, 2 = tests exist, 3 = custom component stories, 4 = API-first pages. */
  rule: 1 | 2 | 3 | 4;
  /** Path relative to the repo/app root the check ran against. */
  path: string;
  message: string;
}

const LAYERS = ["repositories", "services", "routers"] as const;
type Layer = (typeof LAYERS)[number];
type DbDir = "schema" | Layer;

const DB_DIRS: readonly string[] = ["schema", ...LAYERS];
const FORBIDDEN_APP_DIRS = ["server", ...LAYERS];
const SUFFIX: Record<Layer, string> = {
  repositories: "repository",
  services: "service",
  routers: "router",
};
/** Which db/ directories each directory may import from. */
const MAY_IMPORT: Record<DbDir, readonly DbDir[]> = {
  schema: ["schema"],
  repositories: ["repositories", "schema"],
  services: ["services", "repositories", "schema"],
  routers: ["routers", "services"],
};
const DRIZZLE_ALLOWED: readonly DbDir[] = ["schema", "repositories"];
const ELYSIA_ALLOWED: readonly DbDir[] = ["routers"];
/** Created once in the app's composition root and injected into the layers. */
const COMPOSITION_ONLY_IMPORTS = [
  "@repo/storage",
  "@repo/db/client",
];
const LAYER_FILE = /\.(repository|service|router)(\.test)?\.ts$/;
const NEXT_CONFIG = /^next\.config\.(ts|js|mjs)$/;
const STORY_EXPORT = /^export const [A-Z]\w*/m;
const IS_TEST = /\.test\.ts$/;
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;
const API_FIRST_PAGES = [
  "app/page.tsx",
  "app/changelog/page.tsx",
  "app/docs/page.tsx",
];
const DEFAULT_EXPORT = /export default\b/;
const STORY_TITLE = /\btitle:/;

const violation = (
  rule: Violation["rule"],
  path: string,
  message: string
): Violation => ({ rule, path, message });

const entries = (dir: string): Dirent[] =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [];

const toPosix = (path: string) => path.split(sep).join("/");

function walk(dir: string): string[] {
  return entries(dir).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

/** Where a module specifier points inside db/, or null if it's not a db/ path. */
function dbTarget(
  specifier: string,
  fromFile: string,
  dbRoot: string
): { inside: boolean; dir: string } | null {
  let absolute: string;
  if (specifier.startsWith(".")) {
    absolute = resolve(dirname(fromFile), specifier);
  } else if (specifier.startsWith("@/")) {
    absolute = resolve(dbRoot, "..", specifier.slice(2));
  } else {
    return null;
  }
  const rel = relative(dbRoot, absolute);
  if (rel.startsWith("..")) {
    return { inside: false, dir: "" };
  }
  return { inside: true, dir: toPosix(rel).split("/", 1).join("") };
}

function checkImports(
  file: string,
  layer: DbDir,
  dbRoot: string,
  appDir: string
): Violation[] {
  const path = toPosix(relative(appDir, file));
  const found: Violation[] = [];
  const { importedFiles } = ts.preProcessFile(
    readFileSync(file, "utf8"),
    true,
    true
  );
  for (const { fileName: specifier } of importedFiles) {
    const local = dbTarget(specifier, file, dbRoot);
    if (local && !local.inside) {
      found.push(
        violation(
          1,
          path,
          `"${specifier}" reaches outside db/; layers only import within db/`
        )
      );
    } else if (local && !MAY_IMPORT[layer].includes(local.dir as DbDir)) {
      found.push(
        violation(
          1,
          path,
          `${layer}/ may not import from ${local.dir}/ ("${specifier}"); allowed: ${MAY_IMPORT[layer].join(", ")}`
        )
      );
    }
    const isDrizzle =
      specifier === "drizzle-orm" || specifier.startsWith("drizzle-orm/");
    if (isDrizzle && !DRIZZLE_ALLOWED.includes(layer)) {
      found.push(
        violation(
          1,
          path,
          `drizzle-orm belongs in schema/ and repositories/, not ${layer}/`
        )
      );
    }
    const isElysia = specifier === "elysia";
    if (isElysia && !ELYSIA_ALLOWED.includes(layer)) {
      found.push(
        violation(
          1,
          path,
          `elysia belongs in routers/, not ${layer}/`
        )
      );
    }
    if (COMPOSITION_ONLY_IMPORTS.includes(specifier)) {
      found.push(
        violation(
          1,
          path,
          `"${specifier}" is created once in the composition root and injected, never imported by ${layer}/`
        )
      );
    }
  }
  return found;
}

function checkLayerDir(
  layer: Layer,
  dbRoot: string,
  appDir: string
): Violation[] {
  const dir = join(dbRoot, layer);
  const found: Violation[] = [];
  const suffix = SUFFIX[layer];
  const valid = new RegExp(
    `^[a-z0-9]+(-[a-z0-9]+)*\\.${suffix}(\\.test)?\\.ts$`
  );
  const names = new Set(entries(dir).map((e) => e.name));
  for (const entry of entries(dir)) {
    const path = toPosix(relative(appDir, join(dir, entry.name)));
    if (entry.isDirectory()) {
      found.push(
        violation(1, path, `${layer}/ must be flat; remove the subdirectory`)
      );
    } else if (!valid.test(entry.name)) {
      found.push(
        violation(
          1,
          path,
          `files in ${layer}/ must be named <kebab-name>.${suffix}.ts (or .${suffix}.test.ts)`
        )
      );
    } else if (IS_TEST.test(entry.name)) {
      const source = entry.name.replace(".test.ts", ".ts");
      if (!names.has(source)) {
        found.push(violation(2, path, `test has no source file ${source}`));
      }
    } else {
      const testName = entry.name.replace(".ts", ".test.ts");
      if (!names.has(testName)) {
        found.push(violation(2, path, `missing test file ${testName}`));
      }
      found.push(...checkImports(join(dir, entry.name), layer, dbRoot, appDir));
    }
  }
  return found;
}

interface AppPackage {
  version?: string;
  repoRules?: { apiFirst?: boolean };
}

/**
 * Rule 4, for apps that set `"repoRules": { "apiFirst": true }`: the landing,
 * changelog and docs pages exist, CHANGELOG.md has an entry for the current
 * version, and docs/api-snapshot.json was made for that version.
 */
function checkApiFirst(appDir: string): Violation[] {
  const packagePath = join(appDir, "package.json");
  if (!existsSync(packagePath)) {
    return [];
  }
  const pkg: AppPackage = JSON.parse(readFileSync(packagePath, "utf8"));
  if (!pkg.repoRules?.apiFirst) {
    return [];
  }
  const version = String(pkg.version);
  const found: Violation[] = [];

  for (const page of API_FIRST_PAGES) {
    if (!existsSync(join(appDir, page))) {
      found.push(
        violation(
          4,
          page,
          "API-first apps need a landing, changelog and docs page"
        )
      );
    }
  }

  const changelogPath = join(appDir, "CHANGELOG.md");
  const heading = new RegExp(
    `^## \\[?${version.replace(REGEX_SPECIALS, "\\$&")}\\]?(\\s|$)`,
    "m"
  );
  if (
    !(
      existsSync(changelogPath) &&
      heading.test(readFileSync(changelogPath, "utf8"))
    )
  ) {
    found.push(
      violation(4, "CHANGELOG.md", `needs an entry headed "## ${version}"`)
    );
  }

  const snapshotPath = join(appDir, "docs", "api-snapshot.json");
  if (existsSync(snapshotPath)) {
    let snapshotVersion: unknown;
    try {
      snapshotVersion = JSON.parse(readFileSync(snapshotPath, "utf8")).version;
    } catch {
      snapshotVersion = undefined;
    }
    if (snapshotVersion !== version) {
      found.push(
        violation(
          4,
          "docs/api-snapshot.json",
          `is not for version ${version}; run "bun run docs:snapshot"`
        )
      );
    }
  } else {
    found.push(
      violation(
        4,
        "docs/api-snapshot.json",
        'is missing; run "bun run docs:snapshot"'
      )
    );
  }
  return found;
}

/** Rules 1, 2 and 4 for a single Next app. Apps without a backend skip 1 and 2. */
export function checkApp(appDir: string): Violation[] {
  return [...checkBackend(appDir), ...checkApiFirst(appDir)];
}

function checkBackend(appDir: string): Violation[] {
  const dbRoot = join(appDir, "db");
  const hasBackend = [
    "db",
    "drizzle.config.ts",
    "app/api",
    ...FORBIDDEN_APP_DIRS,
  ].some((name) => existsSync(join(appDir, name)));
  if (!hasBackend) {
    return [];
  }

  const found: Violation[] = [];
  for (const name of FORBIDDEN_APP_DIRS) {
    if (existsSync(join(appDir, name))) {
      found.push(
        violation(
          1,
          name,
          `backend code lives in db/{schema,repositories,services,routers}, not ${name}/`
        )
      );
    }
  }
  if (!existsSync(join(dbRoot, "schema"))) {
    found.push(violation(1, "db/schema", "db/schema/ is required"));
  }
  for (const entry of entries(dbRoot)) {
    if (!(entry.isDirectory() && DB_DIRS.includes(entry.name))) {
      found.push(
        violation(
          1,
          `db/${entry.name}`,
          `db/ may only contain ${DB_DIRS.join(", ")}`
        )
      );
    }
  }
  for (const file of walk(dbRoot)) {
    const match = LAYER_FILE.exec(file);
    const [dirName] = toPosix(relative(dbRoot, file)).split("/");
    const layer = LAYERS.find((l) => SUFFIX[l] === match?.[1]);
    if (layer && dirName !== layer) {
      found.push(
        violation(
          1,
          toPosix(relative(appDir, file)),
          `*.${SUFFIX[layer]}.ts files belong in db/${layer}/`
        )
      );
    }
  }
  for (const layer of LAYERS) {
    found.push(...checkLayerDir(layer, dbRoot, appDir));
  }
  for (const file of walk(join(dbRoot, "schema")).filter((f) =>
    f.endsWith(".ts")
  )) {
    found.push(...checkImports(file, "schema", dbRoot, appDir));
  }
  return found;
}

/** Rule 3: every custom ui component has a real Storybook story. */
export function checkCustomStories(repoRoot: string): Violation[] {
  const componentsDir = join(repoRoot, "packages/ui/src/components/custom");
  const storiesDir = join(repoRoot, "apps/docs/stories/custom");
  const components = entries(componentsDir)
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => e.name.replace(".tsx", ""));
  const stories = entries(storiesDir)
    .filter((e) => e.isFile())
    .map((e) => e.name);
  const found: Violation[] = [];

  for (const name of components) {
    const storyFile = `${name}.stories.tsx`;
    const path = `apps/docs/stories/custom/${storyFile}`;
    if (!stories.includes(storyFile)) {
      found.push(
        violation(
          3,
          `packages/ui/src/components/custom/${name}.tsx`,
          `missing story ${path}`
        )
      );
      continue;
    }
    const source = readFileSync(join(storiesDir, storyFile), "utf8");
    const problems = [
      [
        source.includes(`@repo/ui/components/custom/${name}`),
        `must import @repo/ui/components/custom/${name}`,
      ],
      [DEFAULT_EXPORT.test(source), "must default-export the story meta"],
      [STORY_TITLE.test(source), "meta must set a title"],
      [
        STORY_EXPORT.test(source),
        "must export at least one story (export const Name = ...)",
      ],
    ] as const;
    for (const [ok, message] of problems) {
      if (!ok) {
        found.push(violation(3, path, message));
      }
    }
  }
  for (const story of stories) {
    if (!components.includes(story.replace(".stories.tsx", ""))) {
      found.push(
        violation(
          3,
          `apps/docs/stories/custom/${story}`,
          "story has no matching component in packages/ui/src/components/custom/"
        )
      );
    }
  }
  return found;
}

/** Every Next app under apps/* plus the story rule. */
export function checkAll(repoRoot: string): Violation[] {
  const appRoots = entries(join(repoRoot, "apps"))
    .filter((e) => e.isDirectory())
    .map((e) => join(repoRoot, "apps", e.name))
    .filter((dir) => entries(dir).some((e) => NEXT_CONFIG.test(e.name)));

  return [
    ...appRoots.flatMap((dir) =>
      checkApp(dir).map((v) => ({
        ...v,
        path: toPosix(relative(repoRoot, join(dir, v.path))),
      }))
    ),
    ...checkCustomStories(repoRoot),
  ];
}
