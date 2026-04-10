import { notFound, permanentRedirect } from "next/navigation";
import { type Metadata } from "next";
import { MainContent } from "@/app/(public)/_components/main-content";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { IsrWrittenAt } from "@/app/(public)/_components/isr-written-at";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CultivarPageRoot,
  CultivarPageSection,
} from "./_components/cultivar-page-layout";
import { CultivarHeroSection } from "./_components/cultivar-hero-section";
import { CultivarGardenPhotosSection } from "./_components/cultivar-garden-photos-section";
import { CultivarOffersSection } from "./_components/cultivar-offers-section";
import { Muted } from "@/components/typography";
import { generateCultivarJsonLd } from "./_seo/json-ld";
import {
  getCultivarPageMetadata,
  getCultivarPageRouteArtifacts,
} from "./_lib/cultivar-page-route";

export const revalidate = false;
export const dynamic = "force-static";

interface PageProps {
  params: Promise<{
    cultivarNormalizedName: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { cultivarNormalizedName } = await params;
  return getCultivarPageMetadata(cultivarNormalizedName);
}

export default async function CultivarPage({ params }: PageProps) {
  const { cultivarNormalizedName } = await params;

  const artifacts = await getCultivarPageRouteArtifacts(cultivarNormalizedName);
  if (!artifacts) {
    notFound();
  }

  const { canonicalSegment, cultivarPage, routeSegment } = artifacts;

  if (canonicalSegment && cultivarNormalizedName !== canonicalSegment) {
    permanentRedirect(`/cultivar/${canonicalSegment}`);
  }

  const baseUrl = getCanonicalBaseUrl();
  const jsonLd = generateCultivarJsonLd(
    baseUrl,
    routeSegment,
    cultivarPage,
  );

  return (
    <MainContent>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Breadcrumbs
          items={[{ title: "Cultivars" }, { title: cultivarPage.summary.name }]}
        />

        <CultivarPageRoot>
          <CultivarPageSection>
            <CultivarHeroSection cultivarPage={cultivarPage} />
          </CultivarPageSection>

          <CultivarPageSection>
            <CultivarGardenPhotosSection photos={cultivarPage.gardenPhotos} />
          </CultivarPageSection>

          <CultivarPageSection>
            <div className="bg-card flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm">
                Want your catalog listed here? Create your catalog and publish
                when ready.
              </p>
              <SellerIntentLink
                className={cn(buttonVariants({ size: "sm" }))}
                entrySurface="cultivar_page_inline_cta"
                sourcePageType="cultivar"
                sourcePath={`/cultivar/${routeSegment}`}
                ctaId="cultivar-inline-create-catalog"
                ctaLabel="Create your catalog"
              >
                Create your catalog
              </SellerIntentLink>
            </div>
          </CultivarPageSection>

          <CultivarPageSection>
            <CultivarOffersSection offers={cultivarPage.offers} />
          </CultivarPageSection>

          {/* TODO: Re-enable after optimizing related-hybridizer fan-out on cultivar pages. */}
          {/*
          <CultivarPageSection>
            <CultivarRelatedSection
              relatedCultivars={cultivarPage.relatedByHybridizer}
              hybridizer={cultivarPage.summary.hybridizer}
            />
          </CultivarPageSection>
          */}

          <footer id="cultivar-metadata" className="space-y-2 border-t pt-6">
            <Muted>
              {cultivarPage.summary.name} registered with American Hemerocallis
              Society.
            </Muted>
          </footer>
        </CultivarPageRoot>
      </div>

      <IsrWrittenAt
        routePath={`/cultivar/${routeSegment}`}
        routeType="cultivar_page"
      />
    </MainContent>
  );
}
