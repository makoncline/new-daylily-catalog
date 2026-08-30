"use client";

import type { ComponentProps } from "react";
import { LoaderCircleIcon } from "lucide-react";

import { cn } from "#lib/utils";

function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <LoaderCircleIcon
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
