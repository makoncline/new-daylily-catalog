import { generateSoftwareApplicationJsonLd } from "../_seo/json-ld";
import type { PublicPageMetadata } from "../_seo/public-seo";

interface HomePageSEOProps {
  metadata: PublicPageMetadata;
}

export async function HomePageSEO({ metadata }: HomePageSEOProps) {
  const jsonLd = await generateSoftwareApplicationJsonLd(metadata);

  return (
    <>
      {jsonLd.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
