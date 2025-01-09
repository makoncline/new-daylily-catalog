import { initTRPC, TRPCError } from "@trpc/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import superjson from "superjson";
import { db } from "@/server/db";
import { type User } from "@prisma/client";

async function findUserByClerkId(clerkUserId: string): Promise<User | null> {
  return db.user.findUnique({
    where: { clerkUserId },
  });
}

async function createUserFromClerk(clerkUserId: string): Promise<User> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Current Clerk user not found");
  }

  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;

  if (!primaryEmail || !clerkUser.username) {
    throw new Error("Missing required user data from Clerk");
  }

  return db.user.create({
    data: {
      clerkUserId,
      email: primaryEmail,
      username: clerkUser.username,
    },
  });
}

async function getOrCreateUser(clerkUserId: string): Promise<User | null> {
  const existingUser = await findUserByClerkId(clerkUserId);
  if (existingUser) return existingUser;

  return createUserFromClerk(clerkUserId);
}

export const createTRPCContext = async () => {
  const { userId: clerkUserId } = await auth();

  const user = clerkUserId ? await getOrCreateUser(clerkUserId) : null;

  console.log("user createTRPCContext", user);

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
  console.log("user isAuthenticated", opts.ctx.user);
  if (!opts.ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return opts.next({ ctx: opts.ctx });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
