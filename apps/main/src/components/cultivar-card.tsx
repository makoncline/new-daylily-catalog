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
      rel="nofollow"
      prefetch={false}
      className={cn(
        "block h-full w-[75vw] min-w-[75vw] md:w-full md:max-w-[560px] md:min-w-0",
        className,
      )}
    >
      <Card className="group hover:border-primary relative flex h-full cursor-pointer flex-col overflow-hidden transition-all md:h-56 md:flex-row">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden md:h-full md:w-auto">
          {cultivar.imageUrl ? (
            <OptimizedImage
              src={cultivar.imageUrl}
              alt={cultivar.name}
              size="full"
              priority={priority}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="bg-muted/20 h-full w-full" />
          )}
        </div>

        <CardContent className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
          <div className="min-w-0 space-y-2 overflow-hidden">
            <H3 className="text-2xl leading-tight">
              <TruncatedText text={cultivar.name} lines={1} />
            </H3>

            {secondaryLine && (
              <Badge
                variant="secondary"
                className="inline-flex items-center text-xs"
              >
                <TruncatedText text={secondaryLine} lines={1} />
              </Badge>
            )}

            {description && (
              <TruncatedText
                text={description}
                lines={4}
                className="text-muted-foreground text-xs leading-relaxed"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
