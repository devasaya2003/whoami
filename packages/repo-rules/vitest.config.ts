import { defineCoverageConfig } from "@repo/test-suite/vitest-config";

export default defineCoverageConfig({
	rootDir: import.meta.dirname,
	tests: ["src/**/*.test.ts"],
	covered: ["src/**/*.ts"],
	exclude: ["src/cli.ts"],
});
