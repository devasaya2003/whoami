import { defineConfig } from "vitest/config";

// Not a typo: a single uncovered line or branch must fail the build.
const FULL_COVERAGE = 100;

interface CoverageConfigOptions {
  /** Absolute path of the package/app; `@/` resolves here. */
  rootDir: string;
  /** Glob(s) of test files, relative to `rootDir`. */
  tests: string[];
  /** Glob(s) that MUST be fully covered; untested files count as 0%. */
  covered: string[];
  /** Files inside `covered` that are exempt (thin process shells only). */
  exclude?: string[];
  /** Allow an empty suite (apps whose covered dirs are still empty). */
  passWithNoTests?: boolean;
}

export function defineCoverageConfig({
  rootDir,
  tests,
  covered,
  exclude = [],
  passWithNoTests = false,
}: CoverageConfigOptions) {
  return defineConfig({
    root: rootDir,
    resolve: { alias: { "@": rootDir } },
    test: {
      environment: "node",
      include: tests,
      passWithNoTests,
      coverage: {
        provider: "v8",
        include: covered,
        exclude: ["**/*.test.ts", ...exclude],
        reporter: ["text"],
        thresholds: {
          perFile: true,
          lines: FULL_COVERAGE,
          functions: FULL_COVERAGE,
          branches: FULL_COVERAGE,
          statements: FULL_COVERAGE,
        },
      },
    },
  });
}

/**
 * Rule 2: every file in db/repositories, db/services and db/routers must be
 * 100% covered by tests in db/**. Used by each Next app's vitest.config.ts.
 */
export const defineBackendConfig = (rootDir: string) =>
  defineCoverageConfig({
    rootDir,
    tests: ["db/**/*.test.ts", "lib/**/*.test.ts"],
    covered: [
      "db/repositories/**/*.ts",
      "db/services/**/*.ts",
      "db/routers/**/*.ts",
    ],
    passWithNoTests: true,
  });
