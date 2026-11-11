import { assertRepoRules } from "@repo/repo-rules/assert";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

assertRepoRules(import.meta.dirname);

const nextConfig: NextConfig = {
	transpilePackages: ["@repo/ui", "@repo/db", "@repo/storage"],
};

export default nextConfig;

initOpenNextCloudflareForDev();
