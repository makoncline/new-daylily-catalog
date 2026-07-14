import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getHermeticPersona,
  HERMETIC_PERSONA_COOKIE,
  HERMETIC_PERSONAS,
} from "@/lib/hermetic/personas.js";

function authResult(personaKey: string | undefined) {
  const persona = getHermeticPersona(personaKey);
  return {
    isAuthenticated: Boolean(persona),
    userId: persona?.clerkUserId ?? null,
    redirectToSignIn: ({ returnBackUrl }: { returnBackUrl?: URL } = {}) => {
      const target = new URL("/sign-in", returnBackUrl ?? "http://localhost");
      if (returnBackUrl) {
        target.searchParams.set(
          "redirect_url",
          `${returnBackUrl.pathname}${returnBackUrl.search}`,
        );
      }
      return NextResponse.redirect(target);
    },
  };
}

export async function auth() {
  const cookieStore = await cookies();
  return authResult(cookieStore.get(HERMETIC_PERSONA_COOKIE)?.value);
}

export function clerkMiddleware(
  callback: (
    authForRequest: () => Promise<ReturnType<typeof authResult>>,
    request: NextRequest,
  ) => Promise<Response | undefined> | Response | undefined,
) {
  return (request: NextRequest, _event: NextFetchEvent) => {
    const personaKey = request.cookies.get(HERMETIC_PERSONA_COOKIE)?.value;
    return callback(async () => authResult(personaKey), request);
  };
}

export function createRouteMatcher(patterns: string[]) {
  const expressions = patterns.map(
    (pattern) => new RegExp(`^${pattern.replaceAll("/", "\\/")}$`),
  );
  return (request: NextRequest) =>
    expressions.some((expression) => expression.test(request.nextUrl.pathname));
}

export function clerkClient() {
  return Promise.resolve({
    users: {
      async getUser(userId: string) {
        const persona = Object.values(HERMETIC_PERSONAS).find(
          (candidate) => candidate.clerkUserId === userId,
        );
        if (!persona) throw new Error(`Unknown hermetic Clerk user: ${userId}`);
        return {
          id: persona.clerkUserId,
          firstName: persona.name,
          lastName: null,
          imageUrl: "",
          primaryEmailAddress: { emailAddress: persona.email },
          emailAddresses: [{ emailAddress: persona.email }],
        };
      },
    },
  });
}
