"use client";

import { FileX2 } from "lucide-react";
import { H3, Muted } from "@/components/typography";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = <FileX2 className="h-12 w-12 text-muted-foreground" />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
      {icon}
      <div className="space-y-2">
        <H3 className="text-2xl">{title}</H3>
        {description && <Muted className="text-sm">{description}</Muted>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
