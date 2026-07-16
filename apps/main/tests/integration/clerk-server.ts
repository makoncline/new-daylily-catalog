import { cookies } from "next/headers";

const clerkUser = {
  id: "user_integration_seller",
  email: "integration-seller@example.test",
  imageUrl: "",
  primaryEmailAddress: {
    emailAddress: "integration-seller@example.test",
  },
};

const authResult = {
  isAuthenticated: true,
  userId: clerkUser.id,
  redirectToSignIn: () => new Response(null, { status: 307 }),
};

const anonymousAuthResult = {
  isAuthenticated: false,
  userId: null,
  redirectToSignIn: () => new Response(null, { status: 307 }),
};

function authResultForCookie(value: string | undefined) {
  return value === "anonymous" ? anonymousAuthResult : authResult;
}

export async function auth() {
  const cookieStore = await cookies();
  return authResultForCookie(cookieStore.get("integration-auth")?.value);
}

export function createRouteMatcher(patterns: string[]) {
  return (request: { nextUrl: { pathname: string } }) =>
    patterns.some((pattern) => {
      if (pattern.endsWith("(.*)")) {
        return request.nextUrl.pathname.startsWith(pattern.slice(0, -4));
      }
      return request.nextUrl.pathname === pattern;
    });
}

export function clerkMiddleware(
  handler: (
    authenticate: () => Promise<typeof authResult | typeof anonymousAuthResult>,
    request: unknown,
    event: unknown,
  ) => unknown,
) {
  return (
    request: { cookies?: { get(name: string): { value: string } | undefined } },
    event: unknown,
  ) =>
    handler(
      async () =>
        authResultForCookie(request.cookies?.get("integration-auth")?.value),
      request,
      event,
    );
}

export async function clerkClient() {
  return {
    users: {
      getUser: async () => clerkUser,
    },
  };
}
