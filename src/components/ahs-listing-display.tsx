"use client";

import { Separator } from "@/components/ui/separator";
import { type RouterOutputs } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { H3, P, Muted } from "@/components/typography";
import { ImagePopover } from "@/components/image-popover";

interface AhsListingDisplayProps {
  ahsListing: NonNullable<RouterOutputs["public"]["getListing"]["ahsListing"]>;
  className?: string;
}

export function AhsListingDisplay({
  ahsListing,
  className,
}: AhsListingDisplayProps) {
  // Combine all fields into a single array for natural flow
  const fields = [
    { label: "Scape Height", value: ahsListing.scapeHeight },
    { label: "Bloom Size", value: ahsListing.bloomSize },
    { label: "Bloom Season", value: ahsListing.bloomSeason },
    { label: "Form", value: ahsListing.form },
    { label: "Ploidy", value: ahsListing.ploidy },
    { label: "Foliage Type", value: ahsListing.foliageType },
    { label: "Bloom Habit", value: ahsListing.bloomHabit },
    { label: "Bud Count", value: ahsListing.budcount },
    { label: "Branches", value: ahsListing.branches },
    { label: "Sculpting", value: ahsListing.sculpting },
    { label: "Foliage", value: ahsListing.foliage },
    { label: "Flower", value: ahsListing.flower },
    { label: "Fragrance", value: ahsListing.fragrance },
    { label: "Parentage", value: ahsListing.parentage },
    { label: "Color", value: ahsListing.color },
  ].filter((field) => field.value);

  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2">
        {ahsListing.ahsImageUrl && (
          <ImagePopover
            images={[{ url: ahsListing.ahsImageUrl, id: "ahs-image" }]}
            size="sm"
          />
        )}
        <div className="flex flex-col">
          <H3 className="text-[clamp(12px,5vw,24px)]">{ahsListing.name}</H3>
          <Muted>
            ({ahsListing.hybridizer}, {ahsListing.year})
          </Muted>
        </div>
      </div>

      <div className="space-y-4">
        {/* All fields in a natural flow */}
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-y-3">
            {fields.map((field, index) => (
              <div key={field.label} className="flex items-center">
                <div>
                  <Muted className="text-xs font-extralight">
                    {field.label}
                  </Muted>
                  <div>
                    <P className="text-sm font-light">{field.value}</P>
                  </div>
                </div>
                {index < fields.length - 1 && (
                  <Separator orientation="vertical" className="mx-3 h-2/3" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AhsListingDisplaySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
