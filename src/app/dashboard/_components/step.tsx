"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepProps } from "@/types/dashboard-types";

export function Step({
  completed,
  label,
  description,
  icon: Icon,
  isLast,
}: StepProps) {
  return (
    <div className={cn("relative flex gap-4", !isLast && "pb-6")}>
      {!isLast && (
        <div
          className={cn(
            "absolute left-[17px] top-[35px] h-[calc(100%-35px)] w-[2px]",
            completed ? "bg-primary/70" : "bg-border",
          )}
        />
      )}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2",
          completed
            ? "border-primary/70 bg-primary/90 text-white"
            : "border-border bg-background",
        )}
      >
        {completed ? (
          <Check className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "scroll-m-20 text-lg font-semibold tracking-tight",
            "text-foreground",
          )}
        >
          {label}
        </span>
        <span className="text-sm leading-7 text-muted-foreground">
          {description}
        </span>
      </div>
    </div>
  );
}
