"use client";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { FileX2, FilterX } from "lucide-react";

interface NoListingsStateProps {
  isFiltered?: boolean;
  onResetFilter?: () => void;
}

export function NoListingsState({
  isFiltered,
  onResetFilter,
}: NoListingsStateProps) {
  if (isFiltered) {
    return (
      <EmptyState
        icon={<FilterX className="h-12 w-12 text-muted-foreground" />}
        title="No listings found"
        description="Try adjusting your filters"
        action={
          <Button variant="outline" onClick={onResetFilter}>
            Reset filters
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<FileX2 className="h-12 w-12 text-muted-foreground" />}
      title="No listings"
      description="This user hasn't added any listings yet"
    />
  );
}
