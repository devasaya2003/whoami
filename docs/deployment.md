# Deploy whoami (Cloudflare CLI only)

This guide deploys the **Astro portfolio** (`apps/web`) and the **blogs CMS** (`apps/blogs`) with the Wrangler CLI. There is **no** GitHub ↔ Cloudflare integration.

You need:

- A [Cloudflare](https://dash.cloudflare.com/) account
- [Bun](https://bun.sh/) installed locally
- A [Clerk](https://clerk.com/) application (sign-in)

---

## 1. One-time login

From the repo root:

```bash
bun install
bunx wrangler login
```

A browser window opens so you can authorize Wrangler.

---

## 2. Create D1 and R2 (CMS)

Still from the machine where you logged in:

```bash
# D1 database for blogs
bunx wrangler d1 create portfolio

# R2 bucket for uploaded images
bunx wrangler r2 bucket create portfolio
```

Copy the **database_id** from the `d1 create` output.

Open [`apps/blogs/wrangler.jsonc`](../apps/blogs/wrangler.jsonc) and set:

```jsonc
"database_id": "PASTE_YOUR_D1_DATABASE_ID_HERE"
```

Bindings (already named in that file):

| Binding | Resource      |
|---------|---------------|
| `DB`    | D1 `portfolio` |
| `R2`    | R2 `portfolio` |

Migrations live in [`packages/db/migrations`](../packages/db/migrations) (generated with `bun run db:generate` — do not hand-write SQL).

Apply schema:

```bash
# local (Miniflare / OpenNext preview)
cd apps/blogs && bun run db:migrate:local

# production D1
cd apps/blogs && bun run db:migrate
```

### R2 public URL

Make objects readable (custom domain or R2.dev public URL). Put that base URL in `R2_PUBLIC_URL` (no trailing slash required). Example:

```bash
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

---

## 3. Clerk (CMS auth)

1. Create a Clerk application.
2. Enable the **combined sign-in-or-up** experience (default when sign-up URL is unset).
3. In Clerk dashboard → Domains / Paths:
   - Sign-in URL: `/sign-in`
   - **Do not** set a separate Sign-up URL (leave unset so `<SignIn />` also handles sign-up).
4. Add allowed origins / redirect URLs for local `http://localhost:3001` and your production `https://blogs.yourdomain.com`.

Env vars for the CMS:

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key |
| `CLERK_SECRET_KEY` | Secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| _(omit)_ `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Must stay unset |

CMS UI route: **`/sign-in` only** (no `/sign-up` page).

---

## 4. Local env files

Each app has its own `.env` (see `apps/blogs/.env.example` and `apps/web/.env.example`).

**`apps/blogs/.env`:**

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BLOGS_URL=http://localhost:3001
R2_PUBLIC_URL=https://your-public-r2-base

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
```

**`apps/web/.env`** (server-only keys — never `NEXT_PUBLIC_*` / `PUBLIC_*`):

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BLOGS_URL=http://localhost:3001
BLOGS_API_KEY=whami_...your_key...
BLOGS_APP_ID=...your_app_id...
```

Create the API key and copy the app id from the CMS Settings dialog after first sign-in.

Run locally:

```bash
bun run dev
# web → :3000   blogs → :3001
```

`apps/blogs` uses OpenNext’s `initOpenNextCloudflareForDev()` so `next dev` can talk to local D1/R2 from `wrangler.jsonc`. Apply local migrations first (`db:migrate:local`).

---

## 5. Deploy the CMS (`apps/blogs`)

From `apps/blogs` (or `bun run deploy:blogs` at the root):

```bash
cd apps/blogs

# secrets (prompts for values; do not commit them)
bunx wrangler secret put CLERK_SECRET_KEY
bunx wrangler secret put R2_PUBLIC_URL

# public / build-time style vars — set for the Worker as well
bunx wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
bunx wrangler secret put NEXT_PUBLIC_CLERK_SIGN_IN_URL
bunx wrangler secret put NEXT_PUBLIC_APP_URL
bunx wrangler secret put NEXT_PUBLIC_BLOGS_URL
```

Use production URLs for the `NEXT_PUBLIC_*` values when deploying (e.g. `https://yourdomain.com` and `https://blogs.yourdomain.com`).

Then:

```bash
bun run db:migrate    # remote D1
bun run deploy        # OpenNext build + wrangler deploy
```

Attach a custom domain in the Cloudflare dashboard (Workers → `whoami-blogs` → Domains), e.g. `blogs.yourdomain.com`. Update Clerk allowed origins to match.

---

## 6. Deploy the portfolio (`apps/web`)

```bash
cd apps/web

bunx wrangler secret put BLOGS_API_KEY
bunx wrangler secret put BLOGS_APP_ID
bunx wrangler secret put NEXT_PUBLIC_BLOGS_URL   # or PUBLIC_BLOGS_URL
bunx wrangler secret put NEXT_PUBLIC_APP_URL     # or PUBLIC_APP_URL

bun run deploy   # astro build && wrangler deploy
```

Worker name is `whoami-web` ([`apps/web/wrangler.jsonc`](../apps/web/wrangler.jsonc)). Point apex / `www` at this Worker.

The Astro app server-fetches:

- `GET {BLOGS_URL}/api/v1/blogs`
- `GET {BLOGS_URL}/api/v1/blogs/:idOrSlug`

with headers `x-api-key: <BLOGS_API_KEY>` (also accepts `Authorization: Bearer`) and `app-id: <BLOGS_APP_ID>`.

---

## 7. First-time CMS checklist

1. Open `https://blogs.yourdomain.com/sign-in` and sign in (or sign up via the same screen).
2. Create a **user app** for the portfolio (name + public URL).
3. Create an **API key** — copy the plaintext once into `BLOGS_API_KEY` for `apps/web`, and set `BLOGS_APP_ID` to that app’s id (shown in Settings → Public API).
4. Create a blog + version, write in the editor, set status **public** / publish.
5. Confirm `https://yourdomain.com/blogs` lists the post.

---

## 8. Schema changes later

Edit Drizzle schema under `packages/db/src/schema`, then:

```bash
bun run db:generate
cd apps/blogs && bun run db:migrate:local   # test
cd apps/blogs && bun run db:migrate         # production
```

---

## Not used

- GitHub automatic deploys
- better-auth / SMTP OTP
- Turso / `DATABASE_URL`
- AWS S3 credentials for CMS uploads (R2 binding only)

## Handy scripts

| Command | Where | What |
|---------|--------|------|
| `bun run db:generate` | root | Drizzle → SQL + journal/meta |
| `bun run db:migrate:local` | `apps/blogs` | Apply migrations to local D1 |
| `bun run db:migrate` | `apps/blogs` | Apply migrations to remote D1 |
| `bun run deploy` | `apps/blogs` | OpenNext + deploy CMS |
| `bun run deploy` | `apps/web` | Astro + deploy portfolio |
| `bun run deploy:blogs` / `deploy:web` | root | Same via workspace filters |
