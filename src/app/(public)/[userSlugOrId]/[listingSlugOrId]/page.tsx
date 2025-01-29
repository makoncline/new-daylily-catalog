"use server";

import { api } from "@/trpc/server";
import { MainContent } from "@/app/(public)/_components/main-content";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Flower2 } from "lucide-react";
import Link from "next/link";
import { ListingDisplay } from "@/components/listing-display";
import { Suspense } from "react";
import { ListingDisplaySkeleton } from "@/components/listing-display";
import { cn } from "@/lib/utils";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";

interface PageProps {
  params: {
    userSlugOrId: string;
    listingSlugOrId: string;
  };
}

export default async function Page({ params }: PageProps) {
  const { userSlugOrId, listingSlugOrId } = params;

  // First check if the user exists
  const profile = await api.public.getProfile({
    userSlugOrId,
  });

  if (!profile) {
    return (
      <MainContent>
        <EmptyState
          icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
          title="Catalog Not Found"
          description="The catalog you are looking for does not exist."
          action={
            <Button asChild>
              <Link href="/catalogs">Browse Catalogs</Link>
            </Button>
          }
        />
      </MainContent>
    );
  }

  // Then check if the listing exists
  const listing = await api.public.getListing({
    userSlugOrId,
    listingSlugOrId,
  });

  if (!listing) {
    return (
      <MainContent>
        <EmptyState
          icon={<Flower2 className="h-12 w-12 text-muted-foreground" />}
          title="Listing Not Found"
          description="The listing you are looking for does not exist or it was renamed."
          action={
            <Button asChild>
              <Link href={`/${userSlugOrId}`}>View Catalog</Link>
            </Button>
          }
        />
      </MainContent>
    );
  }

  return (
    <MainContent>
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6">
          <PublicBreadcrumbs />
        </div>
        <Suspense fallback={<ListingDisplaySkeleton />}>
          <ListingDisplay listingId={listing.id} hideLink />
        </Suspense>
      </div>
    </MainContent>
  );
}
