export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getTripWellEnterpriseId,
  resolveTripWellEnterpriseId,
} from "@/config/tripWellEnterpriseConfig";
import { prisma } from "@/lib/prisma";
import { companyCorsHeaders, companyOptionsResponse } from "@/lib/auth/company-cors";
import { requireCompanyBearer } from "@/lib/auth/requireCompanyBearer";

export async function OPTIONS() {
  return companyOptionsResponse();
}

/** GET /api/company/attractions — enterprise catalogue for HQ */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireCompanyBearer(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId")?.trim();
    const search = searchParams.get("search")?.trim();
    const enterpriseId = getTripWellEnterpriseId();

    const attractions = await prisma.attraction.findMany({
      where: {
        tripWellEnterpriseId: enterpriseId,
        tripId: null,
        ...(cityId ? { cityId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { address: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { city: true },
    });

    return NextResponse.json(
      {
        success: true,
        attractions,
        data: attractions,
        count: attractions.length,
      },
      { headers: companyCorsHeaders() }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Company attractions list error:", message);
    return NextResponse.json(
      { success: false, error: "Failed to list attractions", details: message },
      { status: 500, headers: companyCorsHeaders() }
    );
  }
}

/** POST /api/company/attractions */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireCompanyBearer(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const {
      tripWellEnterpriseId,
      cityId,
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
      description,
      whyMustDo,
      bestCombinedWith,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400, headers: companyCorsHeaders() }
      );
    }

    const attraction = await prisma.attraction.create({
      data: {
        tripWellEnterpriseId: resolveTripWellEnterpriseId(tripWellEnterpriseId),
        cityId: cityId?.trim() || null,
        title: title.trim(),
        category: category?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        googlePlaceId: googlePlaceId?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        rating: typeof rating === "number" ? rating : null,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        description: typeof description === "string" ? description.trim() || null : null,
        whyMustDo: typeof whyMustDo === "string" ? whyMustDo.trim() || null : null,
        bestCombinedWith:
          typeof bestCombinedWith === "string" ? bestCombinedWith.trim() || null : null,
      },
      include: { city: true },
    });

    return NextResponse.json(
      { success: true, attraction, data: attraction },
      { status: 201, headers: companyCorsHeaders() }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Company attraction create error:", message);
    return NextResponse.json(
      { success: false, error: "Failed to create attraction", details: message },
      { status: 500, headers: companyCorsHeaders() }
    );
  }
}
