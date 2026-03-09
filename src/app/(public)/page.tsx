import { HomePageSEO } from "./_components/home-seo";
import { generateHomePageMetadata } from "./_seo/metadata";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import HomePageClient from "./_components/home-page-client";
import { IsrWrittenAt } from "./_components/isr-written-at";
import {
  getCachedFeaturedPublicCultivars,
  getCachedPublicProfiles,
} from "@/server/db/public-cache";

export const revalidate = false;
export const dynamic = "force-static";

export async function generateMetadata() {
  const url = getBaseUrl();
  return generateHomePageMetadata(url);
}

export default async function HomePage() {
  const url = getBaseUrl();
  const [metadata, catalogs, featuredCultivars] = await Promise.all([
    generateHomePageMetadata(url),
    getCachedPublicProfiles(),
    getCachedFeaturedPublicCultivars(),
  ]);

  return (
    <>
      <HomePageSEO metadata={metadata} />
      <HomePageClient
        catalogs={catalogs}
        featuredCultivars={featuredCultivars}
      />
      <IsrWrittenAt className="pb-8" />
    </>
  );
}
