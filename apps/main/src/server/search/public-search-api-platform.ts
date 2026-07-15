import "server-only";

import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";

export function isPublicSearchApiEnabled() {
  return isPublicCultivarSearchEnabled() && process.env.VERCEL !== "1";
}

export function getPublicSearchApiDisabledResponse() {
  return Response.json(
    {
      error: {
        code: "public_search_api_disabled",
        message:
          "The public search API is disabled on this deployment platform.",
      },
      ok: false,
    },
    {
      status: 404,
    },
  );
}

export function toPublicSearchStatus<
  T extends { path: string; sourcePath: string | null },
>(status: T): Omit<T, "path" | "sourcePath"> {
  const publicStatus: Partial<T> = { ...status };
  delete publicStatus.path;
  delete publicStatus.sourcePath;
  return publicStatus as Omit<T, "path" | "sourcePath">;
}
