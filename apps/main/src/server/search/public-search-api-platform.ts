import "server-only";

export function isPublicSearchApiEnabled() {
  return process.env.VERCEL !== "1";
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
