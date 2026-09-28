import { getClerk } from "@/server/clerk/client";

export async function getScopedOAuthClient(
  request: Request,
  requiredScope: "catalog:read" | "catalog:write" | "catalog:manage",
) {
  const authRequest = new Request(request.url, {
    headers: request.headers,
    method: request.method,
  });
  const requestState = await (
    await getClerk()
  ).authenticateRequest(authRequest, { acceptsToken: ["oauth_token"] });
  const authObject = requestState.toAuth();
  const clerkUserId =
    authObject?.isAuthenticated === true && "userId" in authObject
      ? authObject.userId
      : null;
  const scopes =
    authObject?.isAuthenticated === true && "scopes" in authObject
      ? authObject.scopes
      : [];
  const clientId =
    authObject?.isAuthenticated === true && "clientId" in authObject
      ? authObject.clientId
      : null;
  if (!clerkUserId || !clientId) {
    return { status: "unauthenticated" } as const;
  }
  if (!Array.isArray(scopes) || !scopes.includes(requiredScope)) {
    return { status: "insufficient_scope", clerkUserId, clientId } as const;
  }

  return { status: "authorized", clerkUserId, clientId } as const;
}
