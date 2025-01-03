"use server";

import { Suspense } from "react";
import { api } from "@/trpc/server";
import { ListingForm } from "@/components/forms/listing-form";
import { ListingFormSkeleton } from "./_components/listing-form-skeleton";
import { ListingNotFound } from "./_components/listing-not-found";

interface EditListingPageProps {
  params: {
    id: string;
  };
}

export default async function EditListingPage({
  params,
}: EditListingPageProps) {
  return (
    <div className="container mx-auto p-8">
      <Suspense fallback={<ListingFormSkeleton />}>
        <ListingFetcher id={params.id} />
      </Suspense>
    </div>
  );
}

async function ListingFetcher({ id }: { id: string }) {
  try {
    const listing = await api.listing.get({ id });

    if (!listing) {
      return <ListingNotFound />;
    }

    return <ListingForm listing={listing} />;
  } catch (error) {
    console.error("Error fetching listing:", error);
    return <ListingNotFound />;
  }
}
