import { initTRPC, TRPCError } from "@trpc/server";
import { currentUser } from "@clerk/nextjs/server";
import superjson from "superjson";
import { db } from "@/server/db";

export type Context = {
  db: typeof db;
  user: Awaited<ReturnType<typeof db.user.findUnique>> | null;
};

export const createTRPCContext = async (): Promise<Context> => {
  return {
    db,
    user: null,
  };
};

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  const dbUser = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  if (!dbUser) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found in database",
    });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      user: dbUser,
    },
  });
});
