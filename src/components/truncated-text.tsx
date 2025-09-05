"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TruncatedTextProps {
  /** The text content to display */
  text: string;
  /** Number of lines to show before truncating. If 1, uses text-overflow ellipsis instead of line-clamp */
  lines?: number;
  /** Optional className to merge with default styles */
  className?: string;
  /** Optional callback to report if content is truncated */
  onTruncated?: (isTruncated: boolean) => void;
}

/**
 * A component that truncates text with ellipsis.
 * - For single line (lines=1), uses text-overflow ellipsis
 * - For multiple lines, uses line-clamp
 * - Maintains consistent width behavior with w-max max-w-full
 * - Reports truncation state via onTruncated callback
 */
export function TruncatedText({
  text,
  lines = 1,
  className,
  onTruncated,
}: TruncatedTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !onTruncated) return;

    const isTruncated =
      lines === 1
        ? element.scrollWidth > element.clientWidth
        : element.scrollHeight > element.clientHeight;

    onTruncated(isTruncated);
  }, [text, lines, onTruncated]);

  if (!text) return null;

  const baseClasses = "w-max max-w-full";
  const truncateClasses =
    lines === 1
      ? "truncate whitespace-nowrap"
      : cn("break-words", `line-clamp-${lines}`);

  return (
    <div ref={ref} className={cn(baseClasses, truncateClasses, className)}>
      {text}
    </div>
  );
}
