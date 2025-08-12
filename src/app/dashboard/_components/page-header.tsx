"use client";

import { H1, Muted } from "@/components/typography";

interface PageHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
  /** Optional test id applied to the H1 heading element */
  dataTestId?: string;
}

export function PageHeader({ heading, text, children, dataTestId }: PageHeaderProps) {
  return (
    <div className="mb-8 flex w-full flex-col items-start justify-between gap-4 sm:flex-row">
      <div className="space-y-1">
        <H1 className="text-2xl" data-testid={dataTestId}>
          {heading}
        </H1>
        {text && <Muted>{text}</Muted>}
      </div>
      {children}
    </div>
  );
}
