/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_APP_URL?: string;
	readonly PUBLIC_BLOGS_URL?: string;
	readonly NEXT_PUBLIC_APP_URL?: string;
	readonly NEXT_PUBLIC_BLOGS_URL?: string;
	readonly BLOGS_API_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
