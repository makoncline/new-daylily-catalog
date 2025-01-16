import { initTRPC, TRPCError } from "@trpc/server";
import { auth, getAuth } from "@clerk/nextjs/server";
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
  const user = await db.user.create({
    data: {
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
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId: clerkUserId } = await auth();
  const user = clerkUserId ? await getOrCreateUser(clerkUserId) : null;
  return {
    ...opts,
    db,
    user,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
export const t = initTRPC.context<typeof createTRPCContext>().create({
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
 *//**
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
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

const isAuthenticated = t.middleware((opts) => {
  const {
    ctx: { user },
  } = opts;
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
