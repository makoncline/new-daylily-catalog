import { withUsageRequest } from "@/server/observability/api-usage";
import { getPublicProfile } from "@/server/db/public-seller-read-model";
import { publicJson, publicReadResponse } from "@/server/api/public-http";

export const runtime = "nodejs";

async function read(
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

export async function GET(...args: Parameters<typeof read>) {
  return withUsageRequest(args[0], "public_api", () => read(...args));
}
