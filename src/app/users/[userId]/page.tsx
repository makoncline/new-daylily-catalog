"use server";

import { notFound, permanentRedirect } from "next/navigation";
import { buildLegacyUserRedirectPath } from "@/lib/legacy-route-redirects";
import { db } from "@/server/db";

interface UsersLegacyRoutePageProps {
  params: Promise<{
    userId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UsersLegacyRoutePage({
  params,
  searchParams,
}: UsersLegacyRoutePageProps) {
  const { userId } = await params;
  const resolvedSearchParams = await searchParams;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profile: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const canonicalUserSlug = user.profile?.slug ?? user.id;
  permanentRedirect(
    buildLegacyUserRedirectPath({
      canonicalUserSlug,
      searchParams: resolvedSearchParams,
    }),
  );
}
