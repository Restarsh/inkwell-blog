# Inkwell — Full-Stack Blog (Next.js + Prisma + Postgres)

![CI](https://github.com/Restarsh/inkwell-blog/actions/workflows/ci.yml/badge.svg)

A production-shaped CRUD application: authentication, posts, comments, live
updates over SSE, server-side validation, deployment configs, and CI. Built to
be **read**, not just to run — every layer is explicit so you can explain it in
an interview.

---

## Features

| Area | What it does |
|------|--------------|
| **Auth** | Email + password. bcrypt (cost 12). Signed JWTs in `httpOnly`, `sameSite=lax`, `secure`-in-production cookies. |
| **Posts** | Full CRUD. Auto-generated unique slugs. Draft / published visibility. Author-only edit and delete. |
| **Comments** | Authenticated users comment on published posts. **Live updates via SSE** — new comments appear without a refresh, and a presence count shows who else is reading. Optimistic inserts with reconciliation. |
| **Search** | Case-insensitive `title` + `content` search with pagination. |
| **Guards** | Edge middleware blocks `/dashboard` and `/posts/new` before they render; every mutating API route re-checks the session server-side. |
| **Validation** | Zod schemas shared between client forms and API routes. |
| **Tests** | Vitest unit suite (slug, validation, auth, format) plus Playwright e2e (register → post → comment, cross-tab SSE). |
| **Ops** | GitHub Actions CI (Postgres service, typecheck, unit tests, build), Docker Compose for local DB, deployment configs for four hosts. |

## Stack

- **Next.js 15** (App Router, React 19, Server Components)
- **Prisma 5** ORM → **PostgreSQL 16**
- **jose** for JWT (edge-compatible, so middleware can verify without Node APIs)
- **bcryptjs** for password hashing (pure JS, no native build step)
- **Zod** for input validation
- **Tailwind CSS 3** for styling
- **Vitest** for unit tests, **Playwright** for e2e

> **Why `jose` and not `jsonwebtoken`?** `jsonwebtoken` depends on Node's
> `crypto` and cannot run in Next.js middleware (Edge runtime). `jose` uses
> WebCrypto, so the same token logic works in both places.

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

### 5. Apply the schema

```
npx prisma migrate deploy
# or, for fast local iteration without migration history:
npx prisma db push
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

## Testing

Two suites, separated by what they need to run.

### Unit tests (no database)

```
npm test
```

Covers pure functions: slug generation, Zod validation schemas, JWT
sign/verify, bcrypt hashing, date formatting, reading-time estimation.

### End-to-end tests (needs a running DB + dev server)

```
npx playwright install chromium   # one-time
npm run test:e2e
```

Playwright starts `npm run dev` automatically if port 3000 is free. The two
specs cover:

- `auth-flow.spec.ts` — register → create post → post comment
- `comments.spec.ts` — a comment posted in one tab appears in another via SSE

e2e tests are **not** part of CI — they need a database and are slower. Run
them locally before deploying.

---

## Real-time comments

Comments stream over Server-Sent Events from
`/api/posts/[id]/comments/stream`. The client opens an `EventSource` and
receives three event types:

| Event ↕▾ | Payload ↕▾ | Purpose ↕▾ |
|---|---|---|
| −`connected` | `{ viewerId }` | First frame — confirms the stream is live |
| −`comment` | The full comment object | Emitted when a new comment exists |
| `presence` | `{ count }` | Active readers in the last 30s |
⚙

**How it works**

1. The client opens `EventSource("/api/posts/{id}/comments/stream?since=...")`.
2. The route handler registers the viewer in the `PostViewer` table and starts
two timers: a 2s poll for new comments, and a 10s presence heartbeat.
3. New comments since the last seen timestamp are emitted with the comment's
`createdAt` as the SSE `id:` field.
4. When the connection drops (Vercel Hobby caps at 10s, Pro at 60s), the browser
reconnects automatically and sends `Last-Event-ID`. The route resumes from
that timestamp — no comment is missed.
5. Optimistic UI: `CommentsSection` inserts a `tmp_` comment immediately, then
replaces it with the real one when the POST response arrives. If the SSE
stream delivers the same comment first, the client deduplicates by `id`.

**Why SSE and not WebSockets?** Vercel serverless functions support streaming
responses but not upgraded WebSocket connections. SSE is one-way (server →
client), which matches the use case — the client already POSTs comments over
HTTP.

**Why polling inside the SSE handler?** Serverless functions don't share
memory across instances, so in-memory pub/sub doesn't work. Each connection
polls Postgres. Correct for a portfolio; wouldn't scale past a few hundred
concurrent readers. The production-grade answer is Postgres `LISTEN`/`NOTIFY`
or a dedicated pub/sub service.

**Presence** is stored in `PostViewer` — one row per connection, updated every
10s, counted within a 30s window, pruned after 5min. It measures *readers*, not
unique people, so a two-tab user appears twice.

**Known limitation:** deleted comments don't propagate via SSE. Other viewers
see the comment until they refresh.

---

## Environment variables

| Variable ↕▾ | Required ↕▾ | Notes ↕▾ |
|---|---|---|
| −`DATABASE_URL` | yes | Pooled connection string (Neon: the `-pooler` host). |
| −`DIRECT_URL` | on Neon/Supabase | Direct, non-pooled host. Prisma Migrate uses this. Locally, set it to the same value as `DATABASE_URL`. |
| `JWT_SECRET` | yes | ≥ 32 characters. Rotating it invalidates every session. |
| `NODE_ENV` | auto | Controls the `secure` flag on the session cookie. |
⚙

---

## Scripts

| Command ↕▾ | Purpose ↕▾ |
|---|---|
| −`npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright e2e |
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
│   │       ├── page.tsx       # read + live comments
│   │       └── edit/          # update (owner only)
│   └── api/
│       ├── auth/{register,login,logout,me}/route.ts
│       ├── posts/route.ts                          # GET list · POST create
│       ├── posts/[id]/route.ts                     # GET · PATCH · DELETE
│       ├── posts/[id]/comments/route.ts            # GET · POST
│       ├── posts/[id]/comments/stream/route.ts     # SSE
│       └── comments/[id]/route.ts                  # DELETE
├── components/                # Nav, forms, CommentsSection, cards
└── lib/
    ├── prisma.ts              # client singleton
    ├── auth.ts                # hash, sign, verify, cookie helpers
    ├── validation.ts          # zod schemas
    ├── posts.ts               # unique slug helper
    └── api.ts                 # json + error helpers
tests/
├── setup.ts                   # mocks next/headers, sets JWT_SECRET
├── unit/                      # Vitest
└── e2e/                       # Playwright
```

---

## Security notes

- Passwords are never returned by any query — every `select` is explicit.
- Session cookies are `httpOnly` (unreachable from JS) and `sameSite=lax`
(blocks cross-site POSTs, which covers CSRF for this app's surface).
- The middleware is a **UX** guard, not the security boundary. Every route that
mutates data re-reads the session and re-checks ownership.
- Login returns the same message for "no such user" and "wrong password" to avoid
account enumeration.
- `JWT_SECRET` is validated on use and throws if missing or too short.

## Known limitations (and how you'd fix them)

| Limitation ↕▾ | Fix ↕▾ |
|---|---|
| −No rate limiting on `/api/auth/login` | Upstash Ratelimit or a `LoginAttempt` table with a sliding window |
| SSE polls the DB every 2s per connection | Postgres `LISTEN`/`NOTIFY` or a dedicated pub/sub |
| Presence is per-connection, not per-user | Send a stable viewer ID from the client (e.g. a persistent cookie) |
| Deletions don't propagate via SSE | Emit a `deleted` event, or soft-delete with a `deletedAt` column |
| Slug uniqueness is a check-then-write | Catch `P2002` and retry |
| No email verification or password reset | Resend + signed, single-use tokens |
⚙

---

## Deployment

### Vercel + Neon (recommended)

1. **Database** — create a Neon project. Copy the **pooled** connection string
into `DATABASE_URL` and the **direct** string into `DIRECT_URL`.
2. **Migrations** — run once from your machine against Neon:

```
DATABASE_URL="<direct-url>" npx prisma migrate deploy
```
3. **Import the repo in Vercel.**
4. **Environment variables** — add `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`
in *Settings → Environment Variables* for Production and Preview.
5. **Deploy.** Build command `npm run build` already runs `prisma generate`.

### Railway

1. New project → **Deploy from GitHub repo**.
2. Add a **PostgreSQL** plugin; Railway injects `DATABASE_URL`.
3. Set `JWT_SECRET` and `DIRECT_URL` (same as `DATABASE_URL`).
4. Set the build command to `npm run build`, start to `npm start`.
5. Run migrations from the Railway shell: `npm run db:deploy`.

### Render

1. New **Web Service**. Build: `npm install && npm run build`. Start: `npm start`.
2. New **PostgreSQL**; copy its *Internal* connection string to `DATABASE_URL`.
3. Add `JWT_SECRET`. Set `DIRECT_URL` to the same value.
4. First deploy, then run `npm run db:deploy` from the Render shell.

### Fly.io

```
fly launch --no-deploy
fly postgres create --name inkwell-db
fly postgres attach inkwell-db
fly secrets set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
fly deploy
fly ssh console -C "npm run db:deploy"
```

---

## What to say about this in an interview

- **"How do you handle real-time?"** — SSE from a Route Handler, resumable via
`Last-Event-ID`, backed by per-connection DB polling. Chose SSE over
WebSockets because Vercel serverless can't upgrade connections; chose DB
polling over in-memory pub/sub because serverless instances don't share state.
- **"How do you handle auth?"** — Stateless JWT in an httpOnly cookie; bcrypt for
storage; middleware for redirects; per-route ownership checks for authorization.
- **"What was hard?"** — Keeping the token verifiable in Edge middleware while
hashing stays in the Node runtime; that constraint drove the `jose` / `bcryptjs`
split. And the SSE reconnect story — a naive implementation loses comments
every 10 seconds on Vercel Hobby.
- **"What would you change at scale?"** — Swap DB polling for `LISTEN`/`NOTIFY`,
move sessions to a `Session` table with rotation, add rate limiting, cache the
post list with `revalidateTag`.

## License

MIT

