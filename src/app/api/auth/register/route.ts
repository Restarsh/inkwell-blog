import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";

// bcrypt requires the Node runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = registerSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return fail("An account with that email already exists", 409);
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
    });
    await setSessionCookie(token);

    return ok({ user }, 201);
  } catch (err) {
    return handleError(err);
  }
}
