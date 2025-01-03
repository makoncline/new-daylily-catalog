import { publicProcedure } from "@/server/api/trpc";
import { createTRPCRouter } from "@/server/api/trpc";
import { type inferRouterOutputs } from "@trpc/server";
import { type User } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/server/db";

export const userRouter = createTRPCRouter({
  getCurrentUser: publicProcedure.query(async (): Promise<User | null> => {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return null;
    }

    const dbUser = await db.user.findUnique({
      where: { clerkUserId: clerkUser.id },
    });

    return dbUser;
  }),
});

export type UserRouter = typeof userRouter;
export type UserRouterOutput = inferRouterOutputs<UserRouter>;
export type GetCurrentUserOutput = UserRouterOutput["getCurrentUser"];
