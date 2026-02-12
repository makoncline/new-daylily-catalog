import { OptimizedImage } from "@/components/optimized-image";
import { H1, Muted, P } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type CultivarPageAhsListing = NonNullable<CultivarPageOutput["cultivar"]["ahsListing"]>;

interface CultivarPageAhsDisplayProps {
  ahsListing: CultivarPageAhsListing;
}

export function CultivarPageAhsDisplay({
  ahsListing,
}: CultivarPageAhsDisplayProps) {
  const details = [
    { label: "Scape Height", value: ahsListing.scapeHeight },
    { label: "Bloom Size", value: ahsListing.bloomSize },
    { label: "Bloom Season", value: ahsListing.bloomSeason },
    { label: "Form", value: ahsListing.form },
    { label: "Ploidy", value: ahsListing.ploidy },
    { label: "Foliage Type", value: ahsListing.foliageType },
    { label: "Bloom Habit", value: ahsListing.bloomHabit },
    { label: "Bud Count", value: ahsListing.budcount },
    { label: "Branches", value: ahsListing.branches },
    { label: "Sculpting", value: ahsListing.sculpting },
    { label: "Foliage", value: ahsListing.foliage },
    { label: "Flower", value: ahsListing.flower },
    { label: "Fragrance", value: ahsListing.fragrance },
    { label: "Parentage", value: ahsListing.parentage },
    { label: "Color", value: ahsListing.color },
  ].filter((detail) => detail.value);

  return (
    <div className="space-y-5">
      {ahsListing.ahsImageUrl && (
        <div className="w-full max-w-2xl overflow-hidden rounded-md">
          <OptimizedImage
            src={ahsListing.ahsImageUrl}
            alt={ahsListing.name ? `${ahsListing.name} AHS image` : "AHS image"}
            size="full"
            fit="cover"
            className="aspect-[4/3]"
          />
        </div>
      )}

      <div className="space-y-1">
        <H1 className="text-[clamp(20px,4vw,48px)]">
          {ahsListing.name ?? "Unknown Cultivar"}
        </H1>
        <Muted>
          ({ahsListing.hybridizer ?? "Unknown"}, {ahsListing.year ?? "Year Unknown"})
        </Muted>
      </div>

      {details.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {details.map((detail) => (
            <div key={detail.label} className="space-y-1">
              <Muted className="text-xs">{detail.label}</Muted>
              <P className="text-sm">{detail.value}</P>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
