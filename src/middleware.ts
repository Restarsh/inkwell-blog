import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "inkwell_session";

/** Routes that require a session. */
const PROTECTED_PREFIXES = ["/dashboard", "/posts/new"];

/** Routes a signed-in user should not see. */
const AUTH_PAGES = ["/login", "/register"];

/**
 * Edge middleware: verifies the JWT and redirects.
 *
 * This is a UX guard, NOT the security boundary. It cannot touch Prisma (no
 * Node runtime), so every mutating API route independently re-reads the
 * session and re-checks ownership.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let authenticated = false;

  if (token) {
    const secret = process.env.JWT_SECRET;
    if (secret && secret.length >= 32) {
      try {
        await jwtVerify(token, new TextEncoder().encode(secret), {
          algorithms: ["HS256"],
        });
        authenticated = true;
      } catch {
        authenticated = false;
      }
    }
  }

  if (isProtected && !authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/posts/new", "/login", "/register"],
};
