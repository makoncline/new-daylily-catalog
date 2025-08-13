import { HomePageSEO } from "./_components/home-seo";
import { generateHomePageMetadata } from "./_seo/metadata";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import HomePageClient from "./_components/home-page-client";

export const revalidate = 3600;

export async function generateMetadata() {
  const url = getBaseUrl();
  return generateHomePageMetadata(url);
}

export default async function HomePage() {
  const url = getBaseUrl();
  const metadata = await generateHomePageMetadata(url);

  return (
    <>
      <HomePageSEO metadata={metadata} />
      <HomePageClient />
    </>
  );
}
