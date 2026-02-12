import { db } from "@/server/db";
import {
  getListingIdFromSlugOrId,
  getUserIdFromSlugOrId,
} from "@/server/db/getPublicProfile";
import { notFound, permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    userSlugOrId: string;
    listingSlugOrId: string;
  }>;
}

export default async function LegacyListingRedirectPage({ params }: PageProps) {
  const { userSlugOrId, listingSlugOrId } = await params;

  let userId: string;
  let listingId: string;

  try {
    userId = await getUserIdFromSlugOrId(userSlugOrId);
    listingId = await getListingIdFromSlugOrId(listingSlugOrId, userId);
  } catch {
    notFound();
  }

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
  permanentRedirect(`/${canonicalUserSlug}?viewing=${listingId}`);
}
