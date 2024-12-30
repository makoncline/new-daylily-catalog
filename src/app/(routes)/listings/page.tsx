import { api } from "@/trpc/server";
import { ListingsTable } from "./_components/listings-table";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreateListingButton } from "./_components/create-listing-button";

export default async function ListingsPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const listings = await api.listing.list();

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Listings</h1>
        <CreateListingButton />
      </div>

      <ListingsTable listings={listings} />
    </div>
  );
}
