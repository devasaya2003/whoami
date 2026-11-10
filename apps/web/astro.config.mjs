import path from "node:path";
import { fileURLToPath } from "node:url";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

const rootDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

export default defineConfig({
	output: "server",
	adapter: cloudflare({
		imageService: "compile",
	}),
	// Unused — avoid auto SESSION KV binding until deploy needs sessions.
	session: {
		driver: "memory",
	},
	server: {
		port: 3000,
	},
	// Load monorepo root `.env` (NEXT_PUBLIC_* / BLOGS_API_KEY).
	vite: {
		envDir: rootDir,
	},
});
