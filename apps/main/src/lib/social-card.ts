export const SOCIAL_CARD_SIZE = {
  width: 1200,
  height: 630,
} as const;

export const SOCIAL_CARD_KINDS = [
  "catalog",
  "for-sale",
  "list",
  "listing",
] as const;

export type SocialCardKind = (typeof SOCIAL_CARD_KINDS)[number];

export type PublicSocialCardData =
  | {
      kind: "catalog";
      title: string;
      location: string | null;
      listingCount: number;
      imageUrls: string[];
    }
  | {
      kind: "list";
      title: string;
      sellerTitle: string;
      listingCount: number;
      imageUrls: string[];
    }
  | {
      kind: "listing";
      title: string;
      sellerTitle: string;
      hybridizer: string | null;
      year: string | null;
      price: number | null;
      imageUrls: string[];
    };

export function isSocialCardKind(value: string): value is SocialCardKind {
  return SOCIAL_CARD_KINDS.some((kind) => kind === value);
}

export function getSocialCardImageUrl({
  baseUrl,
  id,
  kind,
  updatedAt,
}: {
  baseUrl: string;
  id: string;
  kind: SocialCardKind;
  updatedAt?: Date | string | null;
}) {
  const url = new URL(
    `/api/og/${kind}/${encodeURIComponent(id)}`,
    `${baseUrl.replace(/\/$/, "")}/`,
  );

  if (updatedAt) {
    const timestamp = new Date(updatedAt).getTime();
    if (Number.isFinite(timestamp)) {
      url.searchParams.set("v", timestamp.toString(36));
    }
  }

  return url.toString();
}
