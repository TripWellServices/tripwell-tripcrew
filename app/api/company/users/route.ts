export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { companyCorsHeaders, companyOptionsResponse } from "@/lib/auth/company-cors";
import { requireCompanyBearer } from "@/lib/auth/requireCompanyBearer";
import { formatCompanyTraveler } from "@/lib/format-company-traveler";

export async function OPTIONS() {
  return companyOptionsResponse();
}

/** GET /api/company/users — travelers on prod for TripWellCompany HQ */
export async function GET(request: Request) {
  try {
    const auth = await requireCompanyBearer(request);
    if (!auth.ok) return auth.response;

    const travelers = await prisma.traveler.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firebaseId: true,
        email: true,
        firstName: true,
        lastName: true,
        photoURL: true,
        hometownCity: true,
        homeState: true,
        persona: true,
        planningStyle: true,
        dreamDestination: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { trips: true } },
      },
    });

    const formatted = travelers.map(formatCompanyTraveler);

    return NextResponse.json(
      {
        success: true,
        travelers: formatted,
        data: formatted,
        count: formatted.length,
      },
      { headers: companyCorsHeaders() }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Company users list error:", message);
    return NextResponse.json(
      { success: false, error: "Server error", details: message },
      { status: 500, headers: companyCorsHeaders() }
    );
  }
}
