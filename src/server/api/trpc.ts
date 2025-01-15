import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import superjson from "superjson";
import { db } from "@/server/db";
import { getClerkUserData } from "@/server/clerk/sync-user";

async function findUserByClerkId(clerkUserId: string) {
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
  const existingUser = await findUserByClerkId(clerkUserId);
  if (existingUser) return existingUser;

  return createUserFromClerk(clerkUserId);
}

export const createTRPCContext = async () => {
  const { userId: clerkUserId } = await auth();

  const user = clerkUserId ? await getOrCreateUser(clerkUserId) : null;

  return {
    db,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

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
