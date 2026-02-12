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
      className={cn("block h-full w-[220px] min-w-[220px]", className)}
    >
      <Card className="group hover:border-primary relative flex h-full cursor-pointer flex-col overflow-hidden transition-all">
        <div className="relative aspect-square w-full">
          {cultivar.imageUrl ? (
            <div className="h-full w-full overflow-hidden">
              <OptimizedImage
                src={cultivar.imageUrl}
                alt={cultivar.name}
                size="full"
                priority={priority}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted/20 h-full w-full" />
          )}
        </div>

        <CardContent className="flex flex-1 flex-col p-3">
          <div className="space-y-2">
            <H3 className="text-2xl leading-tight">
              <TruncatedText text={cultivar.name} lines={1} />
            </H3>

            {secondaryLine && (
              <Badge variant="secondary" className="inline-flex items-center text-xs">
                <TruncatedText text={secondaryLine} lines={1} />
              </Badge>
            )}

            {description && (
              <TruncatedText
                text={description}
                lines={2}
                className="text-muted-foreground text-xs"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CultivarCardSkeleton() {
  return (
    <Card className="group flex h-full w-[220px] min-w-[220px] flex-col overflow-hidden">
      <div className="relative">
        <div className="bg-muted aspect-square" />
      </div>
      <CardContent className="flex flex-1 flex-col p-3">
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
