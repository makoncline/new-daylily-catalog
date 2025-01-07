"use server";

import { Suspense } from "react";
import { api } from "@/trpc/server";
import { ListingForm } from "@/components/forms/listing-form";
import { ListingNotFound } from "./_components/listing-not-found";
import { redirect } from "next/navigation";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";

interface EditListingPageProps {
  params: {
    id: string;
  };
}

async function ListingContent({ id }: { id: string }) {
  try {
    const listing = await api.listing.get({ id });
    if (listing) {
      return (
        <ListingForm
          listing={listing}
          onDelete={() => {
            redirect("/dashboard/listings");
          }}
        />
      );
    }
  } catch (error) {
    console.error("Error fetching listing:", error);
  }
  return <ListingNotFound />;
}

export default async function EditListingPage({
  params,
}: EditListingPageProps) {
  return (
    <div className="container mx-auto p-8">
      <Suspense fallback={<ListingFormSkeleton />}>
        <ListingContent id={params.id} />
      </Suspense>
    </div>
  );
}
