"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TruncatedText } from "@/components/truncated-text";
import { H3 } from "@/components/typography";
import { cn, formatAhsListingSummaryForCard } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";
import { OptimizedImage } from "./optimized-image";

type CultivarPageOutput = NonNullable<
  RouterOutputs["public"]["getCultivarPage"]
>;
type RelatedCultivar = CultivarPageOutput["relatedByHybridizer"][number];

type CultivarCardProps = {
  cultivar: RelatedCultivar;
  className?: string;
  priority?: boolean;
};

export function CultivarCard({
  cultivar,
  className,
  priority = false,
}: CultivarCardProps) {
  const cultivarUrl = `/cultivar/${cultivar.segment}`;
  const secondaryLine = [cultivar.hybridizer, cultivar.year]
    .filter(Boolean)
    .join(", ");
  const description = formatAhsListingSummaryForCard(cultivar.ahsListing);

  return (
    <Link
      href={cultivarUrl}
      className={cn("block h-full w-full max-w-[80vw] md:w-[300px]", className)}
    >
      <Card className="group hover:border-primary relative flex h-full cursor-pointer flex-row overflow-hidden transition-all">
        <div className="relative shrink-0 self-stretch">
          {cultivar.imageUrl ? (
            <div className="h-full aspect-square overflow-hidden">
              <OptimizedImage
                src={cultivar.imageUrl}
                alt={cultivar.name}
                size="thumbnail"
                priority={priority}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted/20 h-full aspect-square" />
          )}
        </div>

        <CardContent className="flex flex-1 flex-col p-4">
          <div className="flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-2">
              <H3>
                <TruncatedText text={cultivar.name} lines={1} />
              </H3>

              {secondaryLine && (
                <Badge variant="secondary" className="inline-flex items-center">
                  <TruncatedText text={secondaryLine} lines={1} />
                </Badge>
              )}

              {description && (
                <p className="text-muted-foreground text-sm break-words">
                  {description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CultivarCardSkeleton() {
  return (
    <Card className="group flex h-full max-w-[200px] flex-col overflow-hidden">
      <div className="relative">
        <div className="bg-muted aspect-square" />
      </div>
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="bg-muted h-6 w-3/4 rounded" />
            <div className="bg-muted h-5 w-1/2 rounded" />
            <div className="flex gap-2">
              <div className="bg-muted h-5 w-16 rounded" />
              <div className="bg-muted h-5 w-16 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
