"use client";

import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type RouterOutputs } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { H3, P, Muted } from "@/components/typography";

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
      <div className="mb-4">
        <H3 className="flex items-center gap-2 text-xl">
          {ahsListing.ahsImageUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="p-2">
                  <div className="h-[200px] w-[200px] overflow-hidden rounded-md border">
                    <Image
                      src={ahsListing.ahsImageUrl}
                      alt={`${ahsListing.name} from AHS database`}
                      width={200}
                      height={200}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {ahsListing.name}{" "}
          <span className="text-base font-normal text-muted-foreground">
            ({ahsListing.hybridizer}, {ahsListing.year})
          </span>
        </H3>
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
