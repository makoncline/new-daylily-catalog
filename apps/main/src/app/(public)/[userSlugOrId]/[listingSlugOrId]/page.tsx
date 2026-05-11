import { replicaDb } from "@/server/db";
import {
  getListingIdFromSlugOrId,
  getUserIdFromSlugOrId,
} from "@/server/db/getPublicProfile";
import { getErrorCode, tryCatch } from "@/lib/utils";
import { notFound, permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    userSlugOrId: string;
    listingSlugOrId: string;
  }>;
}

export default async function LegacyListingRedirectPage({ params }: PageProps) {
  const { userSlugOrId, listingSlugOrId } = await params;

  const routeResult = await tryCatch(
    (async () => {
      const userId = await getUserIdFromSlugOrId(userSlugOrId);
      const listingId = await getListingIdFromSlugOrId(listingSlugOrId, userId);

      return { listingId, userId };
    })(),
  );

  if (getErrorCode(routeResult.error) === "NOT_FOUND") {
    notFound();
  }

  if (!routeResult.data) {
    throw routeResult.error ?? new Error("Failed to resolve legacy listing");
  }

  const { listingId, userId } = routeResult.data;

  const user = await replicaDb.user.findUnique({
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
  permanentRedirect(`/${canonicalUserSlug}?viewing=${listingId}`);
}
