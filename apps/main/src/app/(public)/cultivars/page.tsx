import type { Metadata } from "next";
import { MainContent } from "@/app/(public)/_components/main-content";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { H1 } from "@/components/typography";
import {
  parsePublicCultivarSearchParams,
  type PublicCultivarSearchParamRecord,
} from "@/lib/public-cultivar-search";
import { getCultivarSitemapEntryCount } from "@/server/db/public-cultivar-read-model";
import { searchPublicCultivars } from "@/server/db/public-cultivar-search";
import { CultivarDirectoryClient } from "./_components/cultivar-directory-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search Cultivars",
  description:
    "Search registered daylily cultivars by name, hybridizer, year, color, parentage, and bloom traits.",
  alternates: {
    canonical: "/cultivars",
  },
};

export default async function CultivarsPage({
  searchParams,
}: {
  searchParams?: Promise<PublicCultivarSearchParamRecord>;
}) {
  const rawSearchParams = (await searchParams) ?? {};
  const filters = parsePublicCultivarSearchParams(rawSearchParams);
  const [catalogCount, results] = await Promise.all([
    getCultivarSitemapEntryCount(),
    searchPublicCultivars(filters),
  ]);
  const initialMode =
    rawSearchParams.mode === "advanced" ? "advanced" : "basic";
  const stateKey = JSON.stringify(rawSearchParams);

  return (
    <MainContent className="max-w-6xl">
      <div className="mb-6">
        <Breadcrumbs items={[{ title: "Cultivars" }]} />
      </div>

      <header className="mb-8 max-w-3xl">
        <H1>Cultivars</H1>
        <p className="text-muted-foreground mt-3 text-lg leading-8">
          Search {catalogCount.toLocaleString()} registered daylilies and open
          any cultivar to see its details and available grower listings.
        </p>
      </header>

      <CultivarDirectoryClient
        key={stateKey}
        catalogCount={catalogCount}
        filters={filters}
        initialMode={initialMode}
        results={results}
      />
    </MainContent>
  );
}
