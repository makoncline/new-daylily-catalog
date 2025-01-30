/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ElementType } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface TruncatedTextProps<T extends ElementType = "span"> {
  text: string | null;
  maxLength: number;
  as?: T;
  className?: string;
  [key: string]: any;
}

export function TruncatedText<T extends ElementType>({
  text,
  maxLength,
  as: Component = "span" as T,
  ...props
}: TruncatedTextProps<T>) {
  if (!text) return null;

  const shouldTruncate = text.length > maxLength;
  const truncatedText = shouldTruncate
    ? `${text.slice(0, maxLength)}...`
    : text;

  if (!shouldTruncate) {
    return <Component {...(props as unknown as any)}>{text}</Component>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Component {...(props as any)}>{truncatedText}</Component>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] whitespace-normal text-sm">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
