export const SOCIAL_CARD_SIZE = {
  width: 1200,
  height: 630,
} as const;

const SOCIAL_CARD_KINDS = [
  "catalog",
  "for-sale",
  "list",
  "listing",
] as const;

export type SocialCardKind = (typeof SOCIAL_CARD_KINDS)[number];

interface BaseSocialCardData {
  title: string;
  imageUrls: string[];
}

export type PublicSocialCardData =
  | (BaseSocialCardData & {
      kind: "catalog";
      location: string | null;
      listingCount: number;
    })
  | (BaseSocialCardData & {
      kind: "list";
      sellerTitle: string;
      listingCount: number;
    })
  | (BaseSocialCardData & {
      kind: "listing";
      sellerTitle: string;
      hybridizer: string | null;
      year: string | null;
      price: number | null;
    });

export function isSocialCardKind(value: string): value is SocialCardKind {
  return (SOCIAL_CARD_KINDS as readonly string[]).includes(value);
}

export function getSocialCardImageUrl({
  baseUrl,
  id,
  kind,
}: {
  baseUrl: string;
  id: string;
  kind: SocialCardKind;
}) {
  const url = new URL(`/api/og/${kind}/${encodeURIComponent(id)}`, baseUrl);
  url.searchParams.set("v", "2");
  return url.toString();
}
