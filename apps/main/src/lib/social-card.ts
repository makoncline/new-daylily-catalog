export const SOCIAL_CARD_SIZE = {
  width: 1200,
  height: 630,
} as const;
const CULTIVAR_SOCIAL_CARD_VERSION = "8";

const SOCIAL_CARD_KINDS = [
  "catalog",
  "cultivar",
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
  url.searchParams.set(
    "v",
    kind === "cultivar" ? CULTIVAR_SOCIAL_CARD_VERSION : "2",
  );
  return url.toString();
}

export function getCultivarShareImagePath(
  segment: string,
  variant: "share" | "print" = "share",
) {
  const path = `/api/og/cultivar/${encodeURIComponent(segment)}?v=${CULTIVAR_SOCIAL_CARD_VERSION}`;
  return variant === "print" ? `${path}&variant=print` : path;
}
