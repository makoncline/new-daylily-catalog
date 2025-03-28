import { generateSoftwareApplicationJsonLd } from "../_seo/json-ld";

type MetadataInput = {
  url: string;
  description: string;
  title: string;
  imageUrl: string;
  [key: string]: any;
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
