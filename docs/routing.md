# Routing map (Vercel multi-project rewrites)

Each app deploys as its own Vercel project (root directory: the app folder).
A single domain routes to them via rewrites. On Vercel, create a project for
the intro app (`apps/web`) on the main domain, then add rewrites there.

## Ports (local dev)

| App   | Path     | Port |
| ----- | -------- | ---- |
| web   | `/`      | 3000 |
| blogs | `/blogs` | 3001 |

## Rewrite map (production, on the web project)

| Source          | Destination                                 |
| --------------- | ------------------------------------------- |
| `/blogs/:path*` | `https://<blogs-project>.vercel.app/:path*` |
| `/blogs`        | `https://<blogs-project>.vercel.app`        |

Locally, set `NEXT_PUBLIC_BLOGS_URL` so cross-app links hit the right port.
