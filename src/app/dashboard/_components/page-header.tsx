"use client";

import { H1, Muted } from "@/components/typography";

interface PageHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function PageHeader({ heading, text, children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex w-full flex-col items-start justify-between gap-4 sm:flex-row">
      <div className="space-y-1">
        <H1 className="text-2xl">{heading}</H1>
        {text && <Muted>{text}</Muted>}
      </div>
      {children}
    </div>
  );
}
