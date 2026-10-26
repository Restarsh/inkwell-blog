# Inkwell — Real-time Comments + Tests

A complete, drop-in update. Overwrites 5 files, adds 12, deletes 1.

## What changes

**Real-time comments (SSE)**
- New comments appear without a refresh
- Presence indicator ("3 reading") in the comments header
- Optimistic inserts — your comment appears instantly, then reconciles
- Graceful reconnect on Vercel timeout and Neon free-tier suspension
- Resume from `Last-Event-ID` so no comment is missed during a reconnect

**Tests**
- 4 Vitest unit test files (slug, validation, auth, format) — fast, no DB
- 2 Playwright e2e specs (register → post → comment; cross-tab SSE)
- CI runs unit tests on every push to `master` and `main`

## Files modified
- `prisma/schema.prisma` — added `PostViewer` model
- `src/app/posts/[slug]/page.tsx` — uses `<CommentsSection>`, fetches presence
- `package.json` — new test scripts + devDeps
- `.github/workflows/ci.yml` — runs `npm test`
- `README.md` — new sections: real-time, testing

## Files added
- `prisma/migrations/20261026120000_add_post_viewer/migration.sql`
- `src/app/api/posts/[id]/comments/stream/route.ts`
- `src/components/CommentsSection.tsx`
- `vitest.config.ts`
- `playwright.config.ts`
- `tests/setup.ts`
- `tests/unit/{slug,validation,auth,format}.test.ts`
- `tests/e2e/{auth-flow,comments}.spec.ts`

## Files to delete
- `src/components/CommentForm.tsx` — logic moved into `CommentsSection`

## Steps

### 1. Extract

```bash
cd ~/projects/inkwell-blog
unzip -o ~/Downloads/inkwell-realtime.zip
rm src/components/CommentForm.tsx
```

### 2. Install

```
npm install
```

Adds `vitest@^2.1.8` and `@playwright/test@^1.49.1`.

### 3. Apply the schema change

Local Postgres:

```
npx prisma migrate deploy
```

Or, to skip migration history for this change:

```
npx prisma db push
```

Neon production — swap `.env` to the **direct** Neon URL, then:

```
npx prisma migrate deploy
```

Verify:

```
npx prisma migrate status
# "Database schema is up to date!"
```

### 4. Unit tests (safe, no DB)

```
npm test
```

Expect 20+ passing tests. No database required — pure functions.

### 5. e2e tests (optional)

Requires Postgres running and reachable via `DATABASE_URL`.

```
npx playwright install chromium   # one-time
npm run test:e2e
```

Playwright starts `npm run dev` if port 3000 is free (`reuseExistingServer: true`).

### 6. Deploy

```
git add -A
git commit -m "Real-time comments via SSE; unit + e2e tests; CI"
git push

# apply migration to Neon first
DATABASE_URL="<neon-direct-url>" npx prisma migrate deploy

vercel --prod
```

### 7. Verify

- Open a post in two browser tabs
- Post a comment in one — it should appear in the other within ~2s
- The header should show "2 reading"
- Close one tab — count drops within ~30s
- Post a comment while offline (DevTools → Network → Offline) — the optimistic comment appears, then reverts with an error
- Reconnect — the SSE reconnects automatically with `Last-Event-ID`

## Rollback

```
git revert HEAD
npx prisma db execute --stdin <<< 'DROP TABLE "PostViewer";'
git checkout HEAD~1 -- src/components/CommentForm.tsx
```

## Architecture

**Why SSE not WebSockets?**
Vercel serverless functions support streaming responses but not upgraded WebSocket connections. SSE is one-way (server → client), which matches the use case: the client already POSTs comments over HTTP.

**Why polling inside the SSE handler?**
Serverless functions don't share memory. In-memory pub/sub can't bridge instances. Each SSE connection polls Postgres for new comments. Correct for a portfolio; wouldn't scale past a few hundred concurrent readers. The production-grade answer is Postgres `LISTEN`/`NOTIFY` or a dedicated pub/sub (Ably, Pusher).

**Timeout behaviour**
`export const maxDuration = 60` works on Vercel Pro; on Hobby the platform caps it at 10s and closes the connection. `EventSource` reconnects automatically, sending `Last-Event-ID` so the server resumes from the last seen comment.

**Presence**
The `PostViewer` table stores one row per SSE connection, updated every 10s. Count = rows with `lastSeen` in the last 30s. Rows older than 5min are pruned on each new connection.

**Known limitations**

- Deleted comments don't propagate via SSE. Other viewers see them until they refresh.
- Presence is connection count, not unique people. Multi-tab users appear twice.
- Anonymous viewers get a fresh `viewerId` per connection, so a Vercel-timeout reconnect bumps the count transiently.

</BDS:create_file>

<BDS:create_file fileName="prisma/schema.prisma">

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String
  createdAt    DateTime  @default(now())

  posts    Post[]
  comments Comment[]

  @@index([createdAt])
}

model Post {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  content   String
  published Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  authorId String
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)

  comments Comment[]
  viewers  PostViewer[]

  @@index([authorId])
  @@index([published, createdAt])
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  createdAt DateTime @default(now())

  postId String
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  authorId String
  author   User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([postId, createdAt])
  @@index([authorId])
}

model PostViewer {
  id        String   @id @default(cuid())
  viewerId  String
  postId    String
  lastSeen  DateTime @default(now())

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([postId, viewerId])
  @@index([postId, lastSeen])
  @@index([lastSeen])
}

