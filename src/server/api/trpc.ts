import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import superjson from "superjson";
import { db } from "@/server/db";
import { getClerkUserData } from "@/server/clerk/sync-user";
import { ZodError } from "zod";

export async function getUserByClerkId(clerkUserId: string) {
  const user = await db.user.findUnique({
    where: { clerkUserId },
  });
  if (!user) {
    return null;
  }
  const clerkUserData = await getClerkUserData(user.clerkUserId);
  return { ...user, clerk: clerkUserData };
}

async function createUserFromClerk(clerkUserId: string) {
  // Use upsert to handle case where user already exists (e.g., from test seeding)
  const user = await db.user.upsert({
    where: { clerkUserId },
    update: {},
    create: {
      clerkUserId,
    },
  });
  const clerkUserData = await getClerkUserData(user.clerkUserId);
  return { ...user, clerk: clerkUserData };
}

async function getOrCreateUser(clerkUserId: string) {
  const existingUser = await getUserByClerkId(clerkUserId);
  if (existingUser) return existingUser;

  return createUserFromClerk(clerkUserId);
}

type TRPCContextUser = Awaited<ReturnType<typeof getOrCreateUser>>;

export interface TRPCContext {
  headers: Headers;
  db: typeof db;
}

export interface TRPCInternalContext extends TRPCContext {
  _authUser?: TRPCContextUser | null;
}

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (
  opts: { headers: Headers },
): Promise<TRPCContext> => {
  return {
    ...opts,
    db,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
export const t = initTRPC.context<TRPCInternalContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

async function resolveAuthenticatedUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  return getOrCreateUser(clerkUserId);
}

const isAuthenticated = t.middleware(async (opts) => {
  const user =
    typeof opts.ctx._authUser === "undefined"
      ? await resolveAuthenticatedUser()
      : opts.ctx._authUser;

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      _authUser: user,
      user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
