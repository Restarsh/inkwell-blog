/**
 * Convert an arbitrary title into a URL-safe slug.
 * "Why I Stopped Using ORMs!" -> "why-i-stopped-using-orms"
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  return slug || "post";
}
