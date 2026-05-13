import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { buildLegacyUserRedirectPath } from "@/lib/legacy-route-redirects";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Catalog Redirect | Daylily Catalog",
  description: "Redirecting to the current Daylily Catalog profile page.",
};

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
  const userPromise = params.then(({ userId }) =>
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile: {
          select: {
            slug: true,
          },
        },
      },
    }),
  );
  const [resolvedSearchParams, user] = await Promise.all([
    searchParams,
    userPromise,
  ]);

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
