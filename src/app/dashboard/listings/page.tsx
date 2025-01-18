import { api } from "@/trpc/server";
import { ListingsPageClient } from "./_components/listings-page-client";

export default async function ListingsPage() {
  // Get all listings on the server
  const listings = await api.listing.list();

  return <ListingsPageClient initialListings={listings} />;
}
