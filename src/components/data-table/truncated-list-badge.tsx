"use client";

import { Badge } from "@/components/ui/badge";
import { LIST_CONFIG } from "@/config/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { P } from "@/components/typography";

interface TruncatedListBadgeProps {
  name: string;
  className?: string;
}

export function TruncatedListBadge({
  name,
  className,
}: TruncatedListBadgeProps) {
  const shouldTruncate = name.length > LIST_CONFIG.BADGE.MAX_NAME_LENGTH;
  const truncatedName = shouldTruncate
    ? `${name.slice(0, LIST_CONFIG.BADGE.MAX_NAME_LENGTH)}...`
    : name;

  if (!shouldTruncate) {
    return (
      <Badge variant="secondary" className={cn("whitespace-nowrap", className)}>
        {name}
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div>
            <Badge
              variant="secondary"
              className={cn("whitespace-nowrap", className)}
            >
              {truncatedName}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <P className="text-xs">{name}</P>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
