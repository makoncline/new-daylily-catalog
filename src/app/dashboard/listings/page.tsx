import { api } from "@/trpc/server";
import { ListingsPageClient } from "./_components/listings-page-client";
import { PageHeader } from "../_components/page-header";
import { CreateListingButton } from "./_components/create-listing-button";

export default async function ListingsPage() {
  const listings = await api.listing.list();
  return (
    <>
      <PageHeader heading="Listings" text="Manage and showcase your daylilies.">
        <CreateListingButton />
      </PageHeader>
      <ListingsPageClient initialListings={listings} />
    </>
  );
}
