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
        <TooltipTrigger>
          <Badge
            variant="secondary"
            className={cn("whitespace-nowrap", className)}
          >
            {truncatedName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
