export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { companyCorsHeaders, companyOptionsResponse } from "@/lib/auth/company-cors";
import { requireCompanyBearer } from "@/lib/auth/requireCompanyBearer";
import { formatCompanyTraveler } from "@/lib/format-company-traveler";

export async function OPTIONS() {
  return companyOptionsResponse();
}

/** GET /api/company/users/[id] */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCompanyBearer(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing user id" },
        { status: 400, headers: companyCorsHeaders() }
      );
    }

    const traveler = await prisma.traveler.findUnique({
      where: { id },
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

    if (!traveler) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404, headers: companyCorsHeaders() }
      );
    }

    const formatted = formatCompanyTraveler(traveler);

    return NextResponse.json(
      {
        success: true,
        traveler: formatted,
        data: formatted,
      },
      { headers: companyCorsHeaders() }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Company user detail error:", message);
    return NextResponse.json(
      { success: false, error: "Server error", details: message },
      { status: 500, headers: companyCorsHeaders() }
    );
  }
}
