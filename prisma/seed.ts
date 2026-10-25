/**
 * Seed script — creates a demo account with a few posts and comments.
 * Run with: npm run db:seed
 *
 * Safe to re-run: uses upsert on the demo email.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@inkwell.dev";
const DEMO_PASSWORD = "password123";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "post"
  );
}

const POSTS = [
  {
    title: "Why I Stopped Reaching for an ORM on Every Project",
    content: `For two years my default answer to "how do I talk to the database" was
"Prisma, obviously." Then I spent a week optimising a reporting query and learned how
much I had been outsourcing my own understanding.

An ORM is not an abstraction over SQL. It is an abstraction over *some* SQL, with an
opinion about which parts you are allowed to see. That is a good deal right up until
the query planner disagrees with you.

The point is not to abandon ORMs. The point is to know what they emit. Run
\`.toSQL()\` on your next complex query and read it. If you cannot explain the plan,
you do not yet understand your own application.

## What I do now

1. Model the schema by hand in SQL first.
2. Write the three or four queries that actually matter by hand.
3. Let the ORM handle everything else — CRUD, migrations, the boring 80%.

That is the trade I want: leverage where it is free, control where it is not.`,
  },
  {
    title: "The Cookie Flag That Broke My Auth for Three Hours",
    content: `\`sameSite: "lax"\` versus \`sameSite: "strict"\` looks like a footnote in the docs.
It is not.

With \`strict\`, the browser refuses to send the cookie on *any* cross-site navigation —
including the redirect back from an OAuth provider. Your callback handler sees an
anonymous user and quietly mints a second account. No error. No log line. Just a user
who cannot log in from Google.

\`lax\` sends the cookie on top-level GET navigations but not on cross-site POSTs, which
is exactly the CSRF protection you want for a typical app.

## The checklist I now use

- \`httpOnly\` — always. JavaScript has no business reading a session token.
- \`secure\` — always in production, off on \`localhost\` or the cookie silently vanishes.
- \`sameSite: "lax"\` — the correct default. Use \`strict\` only when you have no
  inbound cross-site navigation at all.
- \`path: "/"\` — set it explicitly, or the cookie scopes itself to the one route that
  set it and you spend an hour wondering where it went.
- \`maxAge\` — a token that never expires is a token you cannot revoke.

Three hours of debugging, five lines of config. Worth writing down.`,
  },
  {
    title: "Notes on Building a Search Box Nobody Hates",
    content: `Search is one of those features that is trivial to build badly and surprisingly
hard to build well. Here is what I learned shipping a small one.

## Debounce is not optional

Every keystroke firing a request is a denial-of-service attack you wrote yourself.
250ms is the sweet spot — fast enough to feel instant, slow enough to skip the
intermediate states of a word.

## Cancel in-flight requests

If you fire request A then request B, and A resolves last, you just rendered stale
results. \`AbortController\` exists for this. Use it.

## Show something during the gap

A spinner that appears after 150ms prevents the flicker of "did that work?" without
making fast queries feel slow.

## Empty results are a feature

"0 results for *foo*" with a suggestion to clear the filter beats a blank panel.
A blank panel reads as a bug.

## Server-side, always

Client-side filtering only works until the dataset does not fit in memory. Do the
\`ILIKE\` on the server, paginate the results, and you will never have to rewrite it.

None of this is novel. All of it is skipped constantly.`,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo Author", passwordHash },
  });

  const commenter = await prisma.user.upsert({
    where: { email: "reader@inkwell.dev" },
    update: {},
    create: {
      email: "reader@inkwell.dev",
      name: "Sam Reader",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });

  for (const post of POSTS) {
    const slug = slugify(post.title);

    const created = await prisma.post.upsert({
      where: { slug },
      update: {},
      create: { ...post, slug, authorId: user.id },
    });

    const existingComments = await prisma.comment.count({ where: { postId: created.id } });
    if (existingComments === 0) {
      await prisma.comment.createMany({
        data: [
          {
            body: "This matched something I hit last month. The part about reading the generated SQL is the bit people skip.",
            postId: created.id,
            authorId: commenter.id,
          },
          {
            body: "Saving this. The checklist format makes it easy to actually apply.",
            postId: created.id,
            authorId: user.id,
          },
        ],
      });
    }
  }

  console.log(`Seeded ${POSTS.length} posts.`);
  console.log(`Login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
