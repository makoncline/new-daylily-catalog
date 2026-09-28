import { getPublicListingDetail } from "@/server/db/public-listing-read-model";
import { publicJson, publicReadResponse } from "@/server/api/public-http";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || id.length > 128) {
    return publicJson({ error: "invalid_id" }, 400);
  }
  return publicReadResponse("public-listing-api", () =>
    getPublicListingDetail(id),
  );
}
