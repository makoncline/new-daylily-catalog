"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { P } from "@/components/typography";
import { TruncatedText } from "@/components/truncated-text";
import { useState } from "react";

interface TooltipCellProps {
  /** The content to display in the cell. If null or "-", will display a dash */
  content: string | null;
  /** Number of lines to show before truncating. Defaults to 1 */
  lines?: number;
}

/**
 * A table cell component that shows a popover with full content when truncated.
 * - Shows a dash for null or "-" values
 * - Truncates content based on available space
 * - Shows full content in a popover on click (mobile-friendly)
 * - Only renders popover if content is actually truncated
 */
export function TooltipCell({ content, lines = 1 }: TooltipCellProps) {
  const [isTruncated, setIsTruncated] = useState(false);

  // Handle empty states
  if (!content || content === "-") return <div>{content ?? "-"}</div>;

  // If content isn't truncated, just show the text
  if (!isTruncated) {
    return (
      <TruncatedText
        text={content}
        lines={lines}
        onTruncated={setIsTruncated}
      />
    );
  }

  // If content is truncated, show with popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">
          <TruncatedText
            text={content}
            lines={lines}
            onTruncated={setIsTruncated}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="max-w-sm">
        <P>{content}</P>
      </PopoverContent>
    </Popover>
  );
}
