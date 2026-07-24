import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { companyCorsHeaders } from "@/lib/auth/company-cors";

export async function requireCompanyBearer(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: companyCorsHeaders() }
      ),
    };
  }

  try {
    await adminAuth.verifyIdToken(authHeader.slice(7));
    return { ok: true as const, authHeader };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid token";
    console.error("Company bearer verification failed:", message);
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401, headers: companyCorsHeaders() }
      ),
    };
  }
}
