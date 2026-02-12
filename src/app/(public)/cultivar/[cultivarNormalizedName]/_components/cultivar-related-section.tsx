import Link from "next/link";
import { OptimizedImage } from "@/components/optimized-image";
import { Badge } from "@/components/ui/badge";
import { H2, H3, Muted } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {relatedCultivars.map((cultivar) => (
          <Link
            key={cultivar.segment}
            href={`/cultivar/${cultivar.segment}`}
            className="group overflow-hidden rounded-lg border"
          >
            <OptimizedImage
              src={cultivar.imageUrl}
              alt={`${cultivar.name} cultivar image`}
              size="full"
              className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />

            <div className="space-y-2 p-3">
              <H3 className="text-2xl leading-tight">{cultivar.name}</H3>

              <div className="flex flex-wrap gap-2">
                {cultivar.bloomSeason && (
                  <Badge variant="secondary" className="text-xs">
                    {cultivar.bloomSeason}
                  </Badge>
                )}
                {cultivar.color && (
                  <Badge variant="outline" className="text-xs">
                    {cultivar.color}
                  </Badge>
                )}
              </div>

              <Muted className="text-xs">
                {[cultivar.hybridizer, cultivar.year].filter(Boolean).join(", ")}
              </Muted>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
