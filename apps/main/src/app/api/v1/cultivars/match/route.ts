import { reportError } from "@/lib/error-utils";
import {
  getPublicSearchApiDisabledResponse,
  isPublicSearchApiEnabled,
  toPublicSearchStatus,
} from "@/server/search/public-search-api-platform";
import {
  matchCultivarNames,
  MAX_CULTIVAR_MATCH_NAME_LENGTH,
  MAX_CULTIVAR_MATCH_NAMES,
} from "@/server/search/cultivar-name-match";
import { PublicSearchIndexUnavailableError } from "@/server/search/public-search-index";

export const runtime = "nodejs";

interface MatchRequestBody {
  cultivarReferenceIds?: unknown;
  includeCandidates?: unknown;
  names?: unknown;
}

function getValidatedBody(body: MatchRequestBody) {
  if (!Array.isArray(body.names)) {
    return { error: "names must be an array of cultivar names." } as const;
  }

  if (body.names.length < 1 || body.names.length > MAX_CULTIVAR_MATCH_NAMES) {
    return {
      error: `Send between 1 and ${MAX_CULTIVAR_MATCH_NAMES} cultivar names at a time.`,
    } as const;
  }

  const names: string[] = [];
  let totalCharacters = 0;

  for (const value of body.names) {
    if (typeof value !== "string") {
      return { error: "Every cultivar name must be a string." } as const;
    }

    const name = value.trim();
    if (!name || name.length > MAX_CULTIVAR_MATCH_NAME_LENGTH) {
      return {
        error: `Cultivar names must be 1-${MAX_CULTIVAR_MATCH_NAME_LENGTH} characters.`,
      } as const;
    }

    totalCharacters += name.length;
    names.push(name);
  }

  if (totalCharacters > 30_000) {
    return { error: "The cultivar-name payload is too large." } as const;
  }

  const includeCandidates = body.includeCandidates === true;
  if (body.cultivarReferenceIds === undefined) {
    return { includeCandidates, names } as const;
  }
  if (
    !Array.isArray(body.cultivarReferenceIds) ||
    body.cultivarReferenceIds.length !== names.length
  ) {
    return {
      error:
        "cultivarReferenceIds must be an array with one value for every cultivar name.",
    } as const;
  }

  const cultivarReferenceIds: Array<string | null> = [];
  for (const value of body.cultivarReferenceIds) {
    if (value === null || value === "") {
      cultivarReferenceIds.push(null);
      continue;
    }
    if (typeof value !== "string") {
      return {
        error: "Every cultivar reference ID must be a string or null.",
      } as const;
    }
    const cultivarReferenceId = value.trim();
    if (!cultivarReferenceId || cultivarReferenceId.length > 200) {
      return {
        error: "Cultivar reference IDs must be 1-200 characters.",
      } as const;
    }
    cultivarReferenceIds.push(cultivarReferenceId);
  }

  return { cultivarReferenceIds, includeCandidates, names } as const;
}

export async function POST(request: Request) {
  if (!isPublicSearchApiEnabled()) {
    return getPublicSearchApiDisabledResponse();
  }

  let body: MatchRequestBody;
  try {
    body = (await request.json()) as MatchRequestBody;
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = getValidatedBody(body);
  if ("error" in validated) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  try {
    const results = await matchCultivarNames(validated);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof PublicSearchIndexUnavailableError) {
      return Response.json(
        {
          error: "public_search_index_unavailable",
          message: "Cultivar matching is warming up. Try again shortly.",
          searchIndex: toPublicSearchStatus(error.status),
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
            "Retry-After": "30",
          },
          status: 503,
        },
      );
    }

    reportError({
      error,
      context: {
        source: "public-cultivar-match",
      },
    });
    return Response.json(
      {
        error: "internal_server_error",
        message: "Cultivar matching could not be completed.",
      },
      {
        headers: { "Cache-Control": "private, no-store" },
        status: 500,
      },
    );
  }
}
