import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

/**
 * Find a slug that is not yet taken, appending -2, -3, ... as needed.
 *
 * This is a check-then-write, so it can race. The `@unique` constraint on
 * Post.slug is the real guarantee — callers should catch Prisma error P2002.
 */
export async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;

  // Bounded loop: after 50 collisions, fall back to a timestamp.
  while (suffix < 50) {
    const existing = await prisma.post.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return `${base}-${Date.now().toString(36)}`;
}
