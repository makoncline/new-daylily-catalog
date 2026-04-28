import { HomePageSEO } from "./_components/home-seo";
import { generateHomePageMetadata } from "./_seo/metadata";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import HomePageClient from "./_components/home-page-client";
import { IsrWrittenAt } from "./_components/isr-written-at";

export const revalidate = false;

export async function generateMetadata() {
  const url = getCanonicalBaseUrl();
  return generateHomePageMetadata(url);
}

export default async function HomePage() {
  const url = getCanonicalBaseUrl();
  const metadata = await generateHomePageMetadata(url);

  return (
    <>
      <HomePageSEO metadata={metadata} />
      <HomePageClient />
      <IsrWrittenAt className="pb-8" routePath="/" routeType="home_page" />
    </>
  );
}
