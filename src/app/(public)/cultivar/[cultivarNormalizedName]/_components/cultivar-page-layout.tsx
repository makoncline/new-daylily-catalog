import { type ReactNode } from "react";
import { H2 } from "@/components/typography";

interface CultivarPageRootProps {
  children: ReactNode;
}

export function CultivarPageRoot({ children }: CultivarPageRootProps) {
  return <div className="space-y-8">{children}</div>;
}

interface CultivarCatalogsSectionProps {
  children: ReactNode;
}

export function CultivarCatalogsSection({
  children,
}: CultivarCatalogsSectionProps) {
  return (
    <div className="space-y-6">
      <H2>Catalogs Carrying This Cultivar</H2>

      {children}
    </div>
  );
}
