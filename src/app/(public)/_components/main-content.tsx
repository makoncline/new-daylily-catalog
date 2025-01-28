"use client";

import { cn } from "@/lib/utils";

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

export function MainContent({ children, className = "" }: MainContentProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-screen-lg flex-1 space-y-4 p-2 md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
