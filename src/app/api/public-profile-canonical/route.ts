import { NextResponse, type NextRequest } from "next/server";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { getPublicProfile } from "@/server/db/getPublicProfile";

export async function GET(request: NextRequest) {
  const userSlugOrId = request.nextUrl.searchParams.get("userSlugOrId");

  if (!userSlugOrId) {
    return NextResponse.json(
      { error: "Missing userSlugOrId query parameter" },
      { status: 400 },
    );
  }

  const profileResult = await tryCatch(getPublicProfile(userSlugOrId));

  if (getErrorCode(profileResult.error) === "NOT_FOUND") {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profileResult.error) {
    return NextResponse.json(
      { error: "Failed to resolve canonical profile slug" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    canonicalUserSlug: profileResult.data.slug ?? profileResult.data.id,
  });
}
