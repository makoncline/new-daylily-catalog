import { getPublicProfile } from "@/server/db/public-seller-read-model";
import { publicJson, publicReadResponse } from "@/server/api/public-http";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slugOrId: string }> },
) {
  const { slugOrId } = await context.params;
  if (!slugOrId || slugOrId.length > 128) {
    return publicJson({ error: "invalid_slug_or_id" }, 400);
  }
  return publicReadResponse("public-profile-api", () =>
    getPublicProfile(slugOrId),
  );
}
