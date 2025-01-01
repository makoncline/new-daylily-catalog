"use client";

import { ListingForm } from "@/components/forms/listing-form";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";

export default function EditListingPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: listing, isLoading } = api.listing.get.useQuery({ id });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!listing) {
    return <div>Listing not found</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <ListingForm listing={listing} />
    </div>
  );
}
