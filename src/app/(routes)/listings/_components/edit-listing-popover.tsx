"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/forms/listing-form";
import { type ListingGetOutput } from "@/server/api/routers/listing";
import { api } from "@/trpc/react";

interface EditListingPopoverProps {
  listing: ListingGetOutput;
}

export function EditListingPopover({ listing }: EditListingPopoverProps) {
  const { data: currentListing } = api.listing.get.useQuery(
    { id: listing.id },
    { initialData: listing },
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Quick Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit: {currentListing.name}</DialogTitle>
          <DialogDescription>
            Make changes to your listing here.
          </DialogDescription>
        </DialogHeader>
        <ListingForm listing={currentListing} />
      </DialogContent>
    </Dialog>
  );
}
