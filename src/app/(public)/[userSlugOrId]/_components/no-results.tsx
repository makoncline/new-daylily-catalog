"use client";

import { EmptyState } from "@/components/empty-state";

interface NoResultsProps {
  filtered?: boolean;
}

export function NoResults({ filtered = false }: NoResultsProps) {
  return (
    <EmptyState
      title={filtered ? "No listings found" : "No listings"}
      description={
        filtered
          ? "Try adjusting your filters"
          : "This catalog doesn't have any listings yet"
      }
    />
  );
}
