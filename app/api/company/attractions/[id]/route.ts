export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { companyCorsHeaders, companyOptionsResponse } from "@/lib/auth/company-cors";
import { requireCompanyBearer } from "@/lib/auth/requireCompanyBearer";

export async function OPTIONS() {
  return companyOptionsResponse();
}

/** GET /api/company/attractions/[id] */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCompanyBearer(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const attraction = await prisma.attraction.findUnique({
      where: { id },
      include: { city: true },
    });

    if (!attraction) {
      return NextResponse.json(
        { success: false, error: "Attraction not found" },
        { status: 404, headers: companyCorsHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, attraction, data: attraction },
      { headers: companyCorsHeaders() }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json(
      { success: false, error: "Failed to fetch attraction", details: message },
      { status: 500, headers: companyCorsHeaders() }
    );
  }
}

/** PUT /api/company/attractions/[id] */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCompanyBearer(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.attraction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Attraction not found" },
        { status: 404, headers: companyCorsHeaders() }
      );
    }

    const {
      title,
      category,
      address,
      phone,
      website,
      googlePlaceId,
      imageUrl,
      rating,
      lat,
      lng,
      cityId,
      description,
      whyMustDo,
      bestCombinedWith,
    } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title?.trim() ?? existing.title;
    if (category !== undefined) data.category = category?.trim() || null;
    if (address !== undefined) data.address = address?.trim() || null;
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (website !== undefined) data.website = website?.trim() || null;
    if (googlePlaceId !== undefined) data.googlePlaceId = googlePlaceId?.trim() || null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null;
    if (rating !== undefined) data.rating = typeof rating === "number" ? rating : null;
    if (lat !== undefined) data.lat = typeof lat === "number" ? lat : null;
    if (lng !== undefined) data.lng = typeof lng === "number" ? lng : null;
    if (cityId !== undefined) data.cityId = cityId?.trim() || null;
    if (description !== undefined) {
      data.description = typeof description === "string" ? description.trim() || null : null;
    }
    if (whyMustDo !== undefined) {
      data.whyMustDo = typeof whyMustDo === "string" ? whyMustDo.trim() || null : null;
    }
    if (bestCombinedWith !== undefined) {
      data.bestCombinedWith =
        typeof bestCombinedWith === "string" ? bestCombinedWith.trim() || null : null;
    }

    const attraction = await prisma.attraction.update({
      where: { id },
      data,
      include: { city: true },
    });

    return NextResponse.json(
      { success: true, attraction, data: attraction },
      { headers: companyCorsHeaders() }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Company attraction update error:", message);
    return NextResponse.json(
      { success: false, error: "Failed to update attraction", details: message },
      { status: 500, headers: companyCorsHeaders() }
    );
  }
}
