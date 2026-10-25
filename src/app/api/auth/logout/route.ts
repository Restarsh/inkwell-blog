import { clearSessionCookie } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
