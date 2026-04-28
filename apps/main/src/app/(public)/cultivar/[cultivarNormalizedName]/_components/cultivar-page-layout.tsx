import { type ReactNode } from "react";

interface CultivarPageRootProps {
  children: ReactNode;
}

export function CultivarPageRoot({ children }: CultivarPageRootProps) {
  return <div className="space-y-10">{children}</div>;
}

interface CultivarPageSectionProps {
  children: ReactNode;
}

export function CultivarPageSection({ children }: CultivarPageSectionProps) {
  return <div className="space-y-4">{children}</div>;
}
