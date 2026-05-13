"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin, Flower2, ListChecks, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/truncated-text";
import { Muted } from "@/components/typography";

export function LocationBadge({ location }: { location: string }) {
  return (
    <Badge variant="secondary" className="max-w-52 items-center gap-1">
      <MapPin className="size-3" />
      <TruncatedText text={location} />
    </Badge>
  );
}

export function ListingCountBadge({ count }: { count: number }) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
      <Flower2 className="size-3" />
      <span>{count} listings</span>
    </Badge>
  );
}

export function ListCountBadge({
  count,
  lists,
}: {
  count: number;
  lists?: { id: string; title: string; listingCount: number }[];
}) {
  const badge = (
    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
      <ListChecks className="size-3" />
      <span>{count} lists</span>
    </Badge>
  );

  if (!lists?.length) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="cursor-pointer">{badge}</div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="p-0">
          <div className="flex max-w-[300px] flex-col gap-2 p-2">
            {lists.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between gap-4"
              >
                <span className="font-medium">{list.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {list.listingCount} listings
                </Badge>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LastUpdatedBadge({ timestamp }: { timestamp: number }) {
  const lastUpdatedLabel = getLastUpdatedLabel(timestamp);
  if (!lastUpdatedLabel) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant="outline"
            className="bg-background/80 backdrop-blur-sm"
          >
            <Clock className="size-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" align="end" className="p-2">
          {lastUpdatedLabel}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MemberSince({ timestamp }: { timestamp: number }) {
  const label = getMemberSinceLabel(timestamp);
  return <Muted className="text-xs">{label}</Muted>;
}

function getLastUpdatedLabel(timestamp: number) {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 7) return "Recently Updated";
  if (days < 30) return "Updated this month";
  return null;
}

function getMemberSinceLabel(timestamp: number) {
  const now = new Date(Date.now());
  const date = new Date(timestamp);
  const months =
    (now.getFullYear() - date.getFullYear()) * 12 +
    now.getMonth() -
    date.getMonth();

  if (months < 1) return "New member";
  if (months < 12) return `Member for ${months} months`;
  const years = Math.floor(months / 12);
  return `Member for ${years} ${years === 1 ? "year" : "years"}`;
}
