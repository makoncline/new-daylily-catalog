"use client";

import { FileX2 } from "lucide-react";
import { H3, Muted } from "@/components/typography";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  "data-testid"?: string;
}

export function EmptyState({
  icon = <FileX2 className="h-12 w-12 text-muted-foreground" />,
  title,
  description,
  action,
  "data-testid": testId,
}: EmptyStateProps) {
  return (
    <div
      className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-md border border-dashed p-8 text-center animate-in fade-in-50"
      data-testid={testId}
    >
      {icon}
      <div className="space-y-2">
        <H3 className="text-2xl" data-testid={`${testId}-title`}>
          {title}
        </H3>
        {description && (
          <Muted className="text-sm" data-testid={`${testId}-description`}>
            {description}
          </Muted>
        )}
      </div>
      {action && (
        <div className="mt-2" data-testid={`${testId}-action`}>
          {action}
        </div>
      )}
    </div>
  );
}
