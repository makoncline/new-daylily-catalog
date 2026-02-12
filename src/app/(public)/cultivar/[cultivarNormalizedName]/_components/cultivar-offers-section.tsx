"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";
import { CultivarOfferGardenCard } from "./cultivar-offer-garden-card";
import {
  applyOfferFiltersToSearchParams,
  DEFAULT_OFFER_FILTERS,
  getFilteredGardenOffers,
  parseOfferFilters,
  type OfferFilters,
  type OfferSort,
} from "./cultivar-offers-utils";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type Offers = CultivarPageOutput["offers"];

interface CultivarOffersSectionProps {
  offers: Offers;
}

const sortLabels: Record<OfferSort, string> = {
  "best-match": "Best Match",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "updated-desc": "Recently Updated",
};

export function CultivarOffersSection({ offers }: CultivarOffersSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseOfferFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const filtered = useMemo(
    () => getFilteredGardenOffers(offers.gardenCards, filters),
    [offers.gardenCards, filters],
  );

  const updateFilters = (nextFilters: OfferFilters) => {
    const nextParams = applyOfferFiltersToSearchParams(
      new URLSearchParams(searchParams.toString()),
      nextFilters,
    );

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <section id="offers" aria-label="Offers" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <H2>Available in Gardens</H2>
          <Muted>
            {filtered.offersCount} {filtered.offersCount === 1 ? "offer" : "offers"} • {" "}
            {filtered.gardens.length} {filtered.gardens.length === 1 ? "garden" : "gardens"}
          </Muted>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={filters.forSaleOnly ? "default" : "outline"}
            size="sm"
            onClick={() =>
              updateFilters({
                ...filters,
                forSaleOnly: !filters.forSaleOnly,
              })
            }
          >
            For sale
          </Button>

          <Button
            type="button"
            variant={filters.hasPhotoOnly ? "default" : "outline"}
            size="sm"
            onClick={() =>
              updateFilters({
                ...filters,
                hasPhotoOnly: !filters.hasPhotoOnly,
              })
            }
          >
            Has photo
          </Button>

          <Select
            value={filters.sort}
            onValueChange={(value) =>
              updateFilters({
                ...filters,
                sort: value as OfferSort,
              })
            }
          >
            <SelectTrigger className="w-[180px]" aria-label="Sort offers">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.forSaleOnly || filters.hasPhotoOnly || filters.sort !== DEFAULT_OFFER_FILTERS.sort) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateFilters(DEFAULT_OFFER_FILTERS)}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {filtered.gardens.length > 0 ? (
        <div className="space-y-4">
          {filtered.gardens.map((gardenCard) => (
            <CultivarOfferGardenCard key={gardenCard.userId} gardenCard={gardenCard} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6">
          <Muted>No offers match the selected filters.</Muted>
        </div>
      )}
    </section>
  );
}
