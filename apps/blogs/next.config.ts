import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@repo/ui", "@repo/db", "@repo/storage"],
};

export default nextConfig;

initOpenNextCloudflareForDev();
