import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID_CREDENTIALS = "Email or password is incorrect";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = loginSchema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    // Same message whether the user is missing or the password is wrong,
    // so this endpoint cannot be used to enumerate accounts.
    if (!user) return fail(INVALID_CREDENTIALS, 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return fail(INVALID_CREDENTIALS, 401);

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
    });
    await setSessionCookie(token);

    return ok({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    return handleError(err);
  }
}
