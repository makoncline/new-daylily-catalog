"use client";
import { AddListingsCombobox } from "./add-listings-combobox";
interface AddListingsSectionProps {
  listId: string;
  onMutationSuccess?: () => void;
}
export function AddListingsSection({
  listId,
  onMutationSuccess,
}: AddListingsSectionProps) {
  return (
    <section aria-labelledby="add-listings-title" className="min-w-0 space-y-2">
      <h2 id="add-listings-title" className="text-sm font-medium">
        Add Listings
      </h2>
      <p className="text-muted-foreground text-sm">
        Search your listings and select one to add to this list.
      </p>
      <AddListingsCombobox
        listId={listId}
        onMutationSuccess={onMutationSuccess}
      />
      <p className="text-muted-foreground text-sm">
        Each listing can be added once. Removing it from this list keeps the
        listing in your catalog.
      </p>
    </section>
  );
}
