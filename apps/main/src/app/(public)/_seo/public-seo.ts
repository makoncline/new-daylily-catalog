import { type Metadata } from "next";
import { METADATA_CONFIG } from "@/config/constants";

export interface PublicPageMetadata extends Metadata {
  description: string;
  imageUrl: string;
  pageUrl: string;
  title: string;
  url: string;
}

interface BuildPublicPageMetadataArgs {
  canonicalPath: string;
  description: string;
  imageAlt: string;
  imageUrl: string;
  socialImageUrl?: string;
  pageUrl: string;
  title: string;
  keywords?: string[];
  locale?: string;
  metadataBase?: URL;
  robots?: Metadata["robots"];
  siteName?: string;
}

interface BuildNoIndexMetadataArgs {
  description: string;
  title: string;
}

export function buildNoIndexMetadata({
  description,
  title,
}: BuildNoIndexMetadataArgs): Metadata {
  return {
    title,
    description,
    robots: "noindex, nofollow",
  };
}

export function buildPublicPageMetadata({
  canonicalPath,
  description,
  imageAlt,
  imageUrl,
  keywords,
  locale = METADATA_CONFIG.LOCALE,
  metadataBase,
  pageUrl,
  robots = "index, follow, max-image-preview:large",
  siteName = METADATA_CONFIG.SITE_NAME,
  socialImageUrl,
  title,
}: BuildPublicPageMetadataArgs): PublicPageMetadata {
  const previewImageUrl = socialImageUrl ?? imageUrl;

  return {
    metadataBase,
    title,
    description,
    url: pageUrl,
    imageUrl,
    pageUrl,
    keywords,
    robots,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName,
      locale,
      type: "website",
      images: [
        {
          url: previewImageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
          ...(socialImageUrl ? { type: "image/png" } : {}),
        },
      ],
    },
    twitter: {
      card: METADATA_CONFIG.TWITTER_CARD_TYPE,
      title,
      description,
      site: METADATA_CONFIG.TWITTER_HANDLE,
      images: [previewImageUrl],
    },
  };
}
