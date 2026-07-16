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

export async function auth() {
  return authResult;
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
    authenticate: () => Promise<typeof authResult>,
    request: unknown,
    event: unknown,
  ) => unknown,
) {
  return (request: unknown, event: unknown) =>
    handler(async () => authResult, request, event);
}

export async function clerkClient() {
  return {
    users: {
      getUser: async () => clerkUser,
    },
  };
}
