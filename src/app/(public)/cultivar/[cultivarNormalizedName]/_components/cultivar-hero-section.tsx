import { type RouterOutputs } from "@/trpc/react";
import { CultivarGallery } from "./cultivar-gallery";
import { CultivarSummaryPanel } from "./cultivar-summary-panel";
import { CultivarQuickSpecs } from "./cultivar-quick-specs";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;

interface CultivarHeroSectionProps {
  cultivarPage: CultivarPageOutput;
}

export function CultivarHeroSection({ cultivarPage }: CultivarHeroSectionProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <CultivarGallery
          images={cultivarPage.heroImages}
          cultivarName={cultivarPage.summary.name}
        />
      </div>

      <div className="space-y-6 lg:col-span-6">
        <CultivarSummaryPanel summary={cultivarPage.summary} />
        <CultivarQuickSpecs
          cultivarName={cultivarPage.summary.name}
          hybridizer={cultivarPage.summary.hybridizer}
          year={cultivarPage.summary.year}
          topSpecs={cultivarPage.quickSpecs.top}
          allSpecs={cultivarPage.quickSpecs.all}
        />
      </div>
    </section>
  );
}
