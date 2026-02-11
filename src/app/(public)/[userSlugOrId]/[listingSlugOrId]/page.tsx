import { STATUS } from "@/config/constants";
import { db } from "@/server/db";
import { notFound, permanentRedirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    userSlugOrId: string;
    listingSlugOrId: string;
  }>;
}

const publicListingVisibilityFilter = {
  OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
};

export default async function LegacyListingRedirectPage({ params }: PageProps) {
  const { userSlugOrId, listingSlugOrId } = await params;

  // Only redirect canonical legacy listing paths: /:userId/:listingId
  const user = await db.user.findUnique({
    where: { id: userSlugOrId },
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

  const listing = await db.listing.findFirst({
    where: {
      id: listingSlugOrId,
      userId: user.id,
      ...publicListingVisibilityFilter,
    },
    select: {
      id: true,
    },
  });

  if (!listing) {
    notFound();
  }

  const canonicalUserSlug = user.profile?.slug ?? user.id;
  permanentRedirect(`/${canonicalUserSlug}?viewing=${listing.id}`);
}
