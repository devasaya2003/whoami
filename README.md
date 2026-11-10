# whoami

A portfolio monorepo of small Next.js apps: an intro site and a markdown blog.
Built with Turborepo + Bun.

## Apps

| App          | Package       | Path     | Dev port |
| ------------ | ------------- | -------- | -------- |
| `apps/web`   | `@repo/web`   | `/`      | 3000     |
| `apps/blogs` | `@repo/blogs` | `/blogs` | 3001     |

Prod routing (one domain, multiple Vercel projects): see [docs/routing.md](docs/routing.md).

## Packages

- `@repo/ui` — shared UI (Tailwind CSS v4) + `globals.css` + favicon
- `@repo/biome-config` — shared Biome (lint + format) config
- `@repo/typescript-config` — shared tsconfigs

## Stack

- Next.js (each app is an independent deployable)
- Markdown files for blogs (`apps/blogs/content/*.md`) — no database, no auth
- Bun workspaces + Turborepo

## Getting started

```sh
bun install
cp .env.example .env
# also copy each app's .env.example -> .env if needed
bun run dev
```

Blog posts are markdown files in `apps/blogs/content/`. Add a file with
frontmatter (`title`, `description`, `date`) and it shows up on the blog list.

## Useful commands

```sh
bun run build          # build all apps and packages (turbo)
bun run lint           # biome check in all workspaces
bun run check-types    # tsc in all workspaces
bun run format         # biome format --write .
```
