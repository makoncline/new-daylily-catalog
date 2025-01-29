"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TABLE_CONFIG } from "@/config/constants";
import { P } from "@/components/typography";

interface TooltipCellProps {
  /** The content to display in the cell. If null or "-", will display a dash */
  content: string | null;
}

/**
 * A table cell component that shows a tooltip when content is truncated.
 * - Shows a dash for null or "-" values
 * - Truncates content longer than TABLE_CONFIG.CELL_TEXT_LENGTH
 * - Shows full content in a tooltip on hover when truncated
 * - Maintains consistent column widths using TABLE_CONFIG
 */
export function TooltipCell({ content }: TooltipCellProps) {
  // Handle empty states
  if (!content || content === "-") return <div>{content ?? "-"}</div>;

  const shouldShowTooltip = content.length > TABLE_CONFIG.CELL_TEXT_LENGTH;
  const truncatedContent = shouldShowTooltip
    ? `${content.slice(0, TABLE_CONFIG.CELL_TEXT_LENGTH)}...`
    : content;

  // Common styles for the cell container
  const cellStyles = {
    style: {
      minWidth: `${TABLE_CONFIG.MIN_COLUMN_WIDTH}px`,
      maxWidth: `${TABLE_CONFIG.MAX_COLUMN_WIDTH}px`,
    },
    className: "truncate",
  };

  // If content doesn't need truncation, just render it
  if (!shouldShowTooltip) {
    return <div {...cellStyles}>{content}</div>;
  }

  // If content needs truncation, show with tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div {...cellStyles}>{truncatedContent}</div>
        </TooltipTrigger>
        <TooltipContent>
          <P>{content}</P>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
