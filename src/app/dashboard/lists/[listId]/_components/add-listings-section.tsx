"use client";

import { AddListingsCombobox } from "./add-listings-combobox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AddListingsSectionProps {
  listId: string;
}

export function AddListingsSection({ listId }: AddListingsSectionProps) {
  return (
    <div className={cn("space-y-2")}>
      <Label>Add Listings</Label>
      <AddListingsCombobox listId={listId} />
      <p className={cn("text-[0.8rem] text-muted-foreground")}>
        Search your listings to add them to this list
      </p>
    </div>
  );
}
