import { H2 } from "@/components/typography";
import { CultivarCard } from "@/components/cultivar-card";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<
  RouterOutputs["public"]["getCultivarPage"]
>;
type RelatedCultivar = CultivarPageOutput["relatedByHybridizer"][number];

interface CultivarRelatedSectionProps {
  relatedCultivars: RelatedCultivar[];
  hybridizer: string | null;
}

export function CultivarRelatedSection({
  relatedCultivars,
  hybridizer,
}: CultivarRelatedSectionProps) {
  if (relatedCultivars.length === 0) {
    return null;
  }

  return (
    <section
      id="related-cultivars"
      aria-label="Other cultivars from this hybridizer"
      className="space-y-4"
    >
      <H2>
        Other cultivars from this hybridizer
        {hybridizer ? `: ${hybridizer}` : ""}
      </H2>

      <div className="overflow-x-auto pb-2">
        <div className="flex w-max gap-4">
          {relatedCultivars.map((cultivar) => (
            <CultivarCard key={cultivar.segment} cultivar={cultivar} />
          ))}
        </div>
      </div>
    </section>
  );
}
