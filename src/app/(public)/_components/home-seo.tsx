import { generateSoftwareApplicationJsonLd } from "../_seo/json-ld";

type MetadataInput = {
  url: string;
  description: string;
  title: string;
  imageUrl: string;
  openGraph?: Record<string, unknown>;
  twitter?: Record<string, unknown>;
  alternates?: Record<string, unknown>;
};

interface HomePageSEOProps {
  metadata: MetadataInput;
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
