"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TruncatedTextProps extends React.HTMLAttributes<HTMLElement> {
  text: string | null;
  maxLength: number;
  as?: keyof JSX.IntrinsicElements;
}

export function TruncatedText({
  text,
  maxLength,
  as: Component = "span",
  ...props
}: TruncatedTextProps) {
  if (!text) return null;

  const shouldTruncate = text.length > maxLength;
  const truncatedText = shouldTruncate
    ? `${text.slice(0, maxLength)}...`
    : text;

  if (!shouldTruncate) {
    return <Component {...props}>{text}</Component>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Component {...props}>{truncatedText}</Component>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] whitespace-normal text-sm">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
