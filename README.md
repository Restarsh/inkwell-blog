# Inkwell — Full-Stack Blog (Next.js + Prisma + Postgres)

A production-shaped CRUD application: authentication, posts, comments, server-side
validation, deployment configs, and CI. Built to be **read**, not just to run — every
layer is explicit so you can explain it in an interview.

---

## Features

| Area | What it does |
|------|--------------|
| **Auth** | Email + password. Passwords hashed with bcrypt (cost 12). Sessions are signed JWTs (HS256) stored in `httpOnly`, `sameSite=lax`, `secure`-in-production cookies. |
| **Posts** | Full CRUD. Auto-generated unique slugs. Draft / published visibility. Author-only edit and delete. |
| **Comments** | Authenticated users can comment on published posts. Authors and comment owners can delete. |
| **Search** | Case-insensitive `title` + `content` search with pagination. |
| **Guards** | Edge middleware blocks `/dashboard` and `/posts/new` before they render; every mutating API route re-checks the session server-side. |
| **Validation** | Zod schemas shared between client forms and API routes. |
| **Ops** | GitHub Actions CI (Postgres service, typecheck, build), Docker Compose for local DB, deployment configs for four hosts. |

## Stack

- **Next.js 15** (App Router, React 19, Server Components)
- **Prisma 5** ORM → **PostgreSQL 16**
- **jose** for JWT (edge-compatible, so middleware can verify without Node APIs)
- **bcryptjs** for password hashing (pure JS, no native build step)
- **Zod** for input validation
- **Tailwind CSS 3** for styling

> **Why `jose` and not `jsonwebtoken`?** `jsonwebtoken` depends on Node's `crypto`
> and cannot run in Next.js middleware (Edge runtime). `jose` uses WebCrypto, so the
> same token logic works in both places.

---

## Quickstart

### 1. Prerequisites
Node 20+, and either Docker or a Postgres connection string.

### 2. Install
```bash
npm install
```

### 3. Environment

```
cp .env.example .env
```

Generate a real secret — do not ship the example value:

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 4. Start Postgres

```
docker compose up -d
```

### 5. Create the schema

```
npm run db:push        # fast, no migration history (fine for dev)
# or, for real migrations:
npm run db:migrate
```

### 6. Seed demo data (optional)

```
npm run db:seed
```

Creates `demo@inkwell.dev` / `password123` with three posts and a few comments.

### 7. Run

```
npm run dev
```

Open http://localhost:3000.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Pooled connection string (Neon: the `-pooler` host). |
| `DIRECT_URL` | on Neon/Supabase | Direct, non-pooled host. Prisma Migrate uses this. Locally, set it to the same value as `DATABASE_URL`. |
| `JWT_SECRET` | yes | ≥ 32 characters. Rotating it invalidates every session. |
| `NODE_ENV` | auto | Controls the `secure` flag on the session cookie. |

---

## Scripts

| Command ↕▾ | Purpose ↕▾ |
|---|---|
| −`npm run dev` | Dev server |
| −`npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Sync schema without migration files |
| `npm run db:migrate` | Create + apply a migration (dev) |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:studio` | Prisma Studio GUI |
| `npm run db:seed` | Load demo data |
⚙

---

## Project layout

```
src/
├── middleware.ts              # edge guard: verifies JWT, redirects
├── app/
│   ├── layout.tsx             # shell + nav (reads session)
│   ├── page.tsx               # post list, search, pagination
│   ├── login/  register/      # auth pages
│   ├── dashboard/             # my posts (protected)
│   ├── posts/
│   │   ├── new/               # create (protected)
│   │   └── [slug]/
│   │       ├── page.tsx       # read + comments
│   │       └── edit/          # update (owner only)
│   └── api/
│       ├── auth/{register,login,logout,me}/route.ts
│       ├── posts/route.ts                 # GET list · POST create
│       ├── posts/[id]/route.ts            # GET · PATCH · DELETE
│       ├── posts/[id]/comments/route.ts   # GET · POST
│       └── comments/[id]/route.ts         # DELETE
├── components/                # Nav, forms, cards
└── lib/
    ├── prisma.ts              # client singleton
    ├── auth.ts                # hash, sign, verify, cookie helpers
    ├── validation.ts          # zod schemas
    ├── posts.ts               # unique slug helper
    └── api.ts                 # json + error helpers
```

---

## API reference

All routes return JSON. Errors are `{ "error": "message" }`; validation failures
add `{ "issues": [{ "path": "email", "message": "..." }] }` with status **422**.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account, sets session cookie. **201** |
| `POST` | `/api/auth/login` | — | Sets session cookie |
| `POST` | `/api/auth/logout` | — | Clears session cookie |
| `GET` | `/api/auth/me` | ✓ | Current user |
| `GET` | `/api/posts?page=1&limit=10&q=term` | — | Paginated published posts |
| `POST` | `/api/posts` | ✓ | Create post. **201** |
| `GET` | `/api/posts/:idOrSlug` | — | Single post + comments |
| `PATCH` | `/api/posts/:idOrSlug` | owner | Partial update |
| `DELETE` | `/api/posts/:idOrSlug` | owner | Delete post (cascades comments) |
| `GET` | `/api/posts/:idOrSlug/comments` | — | Comment list |
| `POST` | `/api/posts/:idOrSlug/comments` | ✓ | Add comment. **201** |
| `DELETE` | `/api/comments/:id` | owner | Delete comment |

Status codes: `401` not authenticated · `403` not the owner · `404` missing · `409` conflict.

---

## Security notes

- Passwords are never returned by any query — every `select` is explicit.
- Session cookies are `httpOnly` (unreachable from JS) and `sameSite=lax`
(blocks cross-site POSTs, which covers CSRF for this app's surface).
- The middleware is a **UX** guard, not the security boundary. Every route that
mutates data re-reads the session and re-checks ownership.
- Login returns the same message for "no such user" and "wrong password" to avoid
account enumeration. Register necessarily reveals that an email exists — an
acceptable tradeoff for a demo; production would use an email-verification flow.
- `JWT_SECRET` is validated on use and throws if missing or too short.

## Known limitations (and how you'd fix them)

| Limitation | Fix |
|---|---|
| No rate limiting on `/api/auth/login` | Upstash Ratelimit or a `LoginAttempt` table with a sliding window |
| Slug uniqueness is a check-then-write | The `@unique` constraint is the real guard; catch `P2002` and retry |
| No email verification or password reset | Resend + signed, single-use tokens in a `VerificationToken` table |
| Content is plain text | Add MDX or a Markdown renderer with sanitization |
| No optimistic UI | `useOptimistic` in the comment list |
| Single role | Add a `role` enum and check it in a `can()` helper |

---

## Deployment

### Vercel + Neon (recommended)

1. **Database** — create a Neon project. Copy the **pooled** connection string into
`DATABASE_URL` and the **direct** string into `DIRECT_URL`.
2. **Migrations** — run once from your machine against the Neon database:

```
DATABASE_URL="<direct-url>" npm run db:deploy
```
3. **Import the repo in Vercel.** The framework preset is detected automatically.
4. **Environment variables** — add `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET`
in *Settings → Environment Variables* for Production and Preview.
5. **Deploy.** Build command `npm run build` already runs `prisma generate`.

> `postinstall: prisma generate` is in `package.json` so Vercel's install step
> produces a client even if the build cache is cold.

### Railway

1. New project → **Deploy from GitHub repo**.
2. Add a **PostgreSQL** plugin; Railway injects `DATABASE_URL`.
3. Set `JWT_SECRET` and `DIRECT_URL` (same as `DATABASE_URL`).
4. Set the build command to `npm run build` and start command to `npm start`.
5. Run migrations from the Railway shell: `npm run db:deploy`.

### Render

1. New **Web Service** from your repo. Build: `npm install && npm run build`. Start: `npm start`.
2. New **PostgreSQL** instance; copy its *Internal* connection string to `DATABASE_URL`.
3. Add `JWT_SECRET`. Set `DIRECT_URL` to the same value.
4. First deploy, then run `npm run db:deploy` from the Render shell.

### Fly.io

```
fly launch --no-deploy          # generates fly.toml
fly postgres create --name inkwell-db
fly postgres attach inkwell-db  # sets DATABASE_URL automatically
fly secrets set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
fly deploy
fly ssh console -C "npm run db:deploy"
```

Make sure `fly.toml` sets `internal_port = 3000` and that the Dockerfile installs
with `npm ci` if you commit a lockfile.

---

## What to say about this in an interview

- **"How do you handle auth?"** — Stateless JWT in an httpOnly cookie; bcrypt for
storage; middleware for redirects; per-route ownership checks for authorization.
- **"What was hard?"** — Keeping the token verifiable in Edge middleware while
hashing stays in the Node runtime; that constraint drove the `jose` / `bcryptjs` split.
- **"What would you change at scale?"** — Move sessions to a `Session` table with
rotation and revocation, add rate limiting, split reads onto a replica, cache the
post list with `revalidateTag`.

## License

MIT

</BDS:create_file>

<BDS:create_file fileName="inkwell-blog/package.json">

```json
{
  "name": "inkwell-blog",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "postinstall": "prisma generate"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.6",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "prisma": "^5.22.0",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}

