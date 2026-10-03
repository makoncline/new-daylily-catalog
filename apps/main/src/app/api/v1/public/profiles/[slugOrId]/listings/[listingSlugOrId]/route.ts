import { publicJson, publicReadResponse } from "@/server/api/public-http";
import { getPublicListingDetail } from "@/server/db/public-listing-read-model";
import {
  getListingIdFromSlugOrId,
  getUserIdFromSlugOrId,
} from "@/server/db/public-seller-read-model";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ slugOrId: string; listingSlugOrId: string }>;
  },
) {
  const { slugOrId, listingSlugOrId } = await context.params;
  if (
    !slugOrId ||
    slugOrId.length > 128 ||
    !listingSlugOrId ||
    listingSlugOrId.length > 128
  ) {
    return publicJson({ error: "invalid_slug_or_id" }, 400);
  }

  return publicReadResponse("public-listing-by-path-api", async () => {
    const userId = await getUserIdFromSlugOrId(slugOrId);
    const listingId = await getListingIdFromSlugOrId(listingSlugOrId, userId);
    return getPublicListingDetail(listingId);
  });
}
