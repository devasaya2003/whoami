import { findRepoRoot, formatViolations } from "./assert";
import { checkAll } from "./rules";

const violations = checkAll(findRepoRoot(import.meta.dirname));

if (violations.length > 0) {
  console.error(
    `Repo rules violated (${violations.length}):\n${formatViolations(violations)}`
  );
  process.exit(1);
}
console.log("Repo rules: ok");
