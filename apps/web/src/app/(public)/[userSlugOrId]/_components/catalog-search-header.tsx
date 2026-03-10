"use client";

import { FloatingCartButton } from "@/components/floating-cart-button";
import { H1, P } from "@/components/typography";

interface CatalogSearchHeaderProps {
  profile: {
    id: string;
    title: string | null;
  };
}

export function CatalogSearchHeader({ profile }: CatalogSearchHeaderProps) {
  const gardenName = profile.title ?? "Unnamed Garden";

  return (
    <div id="profile" className="space-y-3">
      <H1 className="text-[clamp(24px,5vw,48px)]">{gardenName}</H1>

      <P className="text-lg text-muted-foreground">
        Search and filter listings from this garden.
      </P>

      <FloatingCartButton
        userId={profile.id}
        userName={profile.title ?? undefined}
        showTopButton
      />
    </div>
  );
}
