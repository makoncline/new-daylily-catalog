"use client";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { H3, P, Muted } from "@/components/typography";
import { ImagePopover } from "@/components/image-popover";
import type { AhsRow } from "./types";

const FIELDS = [
  ["scapeHeight", "Scape Height"],
  ["bloomSize", "Bloom Size"],
  ["bloomSeason", "Bloom Season"],
  ["form", "Form"],
  ["ploidy", "Ploidy"],
  ["foliageType", "Foliage Type"],
  ["budcount", "Bud Count"],
  ["branches", "Branches"],
  ["fragrance", "Fragrance"],
  ["color", "Color"],
] as const satisfies ReadonlyArray<readonly [keyof AhsRow, string]>;

export function AhsListingDisplayTwo({
  ahsListing,
  className,
}: {
  ahsListing: AhsRow;
  className?: string;
}) {
  const fields = FIELDS.map(([key, label]) => ({
    label,
    value: ahsListing[key],
  })).filter((f) => f.value != null && String(f.value).length > 0);

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
          <H3 className="text-[clamp(12px,5vw,24px)]">
            {ahsListing.name ?? "Unnamed"}
          </H3>
          <Muted>
            {(ahsListing.hybridizer ?? "").toString()}
            {ahsListing.year ? `, ${ahsListing.year}` : ""}
          </Muted>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-y-3">
            {fields.map((field, index) => (
              <div key={field.label} className="flex items-center">
                <div>
                  <Muted className="text-xs font-extralight">
                    {field.label}
                  </Muted>
                  <div>
                    <P className="text-sm font-light">{String(field.value)}</P>
                  </div>
                </div>
                {index < fields.length - 1 && (
                  <Separator orientation="vertical" className="mx-3 h-2/3" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AhsListingDisplayTwoSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
