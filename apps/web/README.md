# web (intro app)

Portfolio intro app served at `/`.

- Prod: deployed as its own Vercel project; a rewrite map (see `docs/routing.md`
  at the repo root) routes `/blogs` to the blogs app.
- Dev: `bun dev` (runs on port 3000 via `turbo dev`).
