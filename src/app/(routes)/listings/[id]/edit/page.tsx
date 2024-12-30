import { api } from "@/trpc/server";
import { ListingForm } from "@/components/forms/listing-form";
import { notFound } from "next/navigation";

interface EditListingPageProps {
  params: {
    id: string;
  };
}

export default async function EditListingPage({
  params,
}: EditListingPageProps) {
  const listing = await api.listing.get({ id: params.id });

  if (!listing) {
    notFound();
  }

  return (
    <div className="container">
      <ListingForm listing={listing} />
    </div>
  );
}
