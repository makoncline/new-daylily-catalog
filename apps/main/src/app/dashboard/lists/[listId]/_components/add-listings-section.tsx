"use client";
import { AddListingsCombobox } from "./add-listings-combobox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
interface AddListingsSectionProps {
  listId: string;
  onMutationSuccess?: () => void;
}
export function AddListingsSection({
  listId,
  onMutationSuccess,
}: AddListingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Add Listings
        </CardTitle>
        <CardDescription>
          Search your listings and select one to add to this list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AddListingsCombobox
          listId={listId}
          onMutationSuccess={onMutationSuccess}
        />
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-sm">
          Each listing can be added once. Removing it from this list keeps the
          listing in your catalog.
        </p>
      </CardFooter>
    </Card>
  );
}
