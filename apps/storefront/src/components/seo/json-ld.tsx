interface JsonLdProps {
  value: Record<string, unknown> | Record<string, unknown>[];
}

export async function JsonLd({ value }: JsonLdProps) {
  const json = JSON.stringify(value).replaceAll("<", "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
