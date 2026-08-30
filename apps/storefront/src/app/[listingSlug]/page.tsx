import { Badge } from "@daylily-catalog/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@daylily-catalog/ui/components/card";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ImageGallery } from "@/components/catalog/image-gallery";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkButton } from "@/components/layout/link-button";
import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getFirstStorefrontImage,
  getOrderedStorefrontImages,
  getStorefrontThumbnailUrl,
} from "@/lib/storefront-images";
import { getStorefrontSnapshot } from "@/server/storefront";
import { findStorefrontListingBySlug } from "@/types/storefront-query";

interface ListingPageProps {
  params: Promise<{ listingSlug: string }>;
}

const traitLabels = {
  hybridizer: "Hybridizer",
  year: "Year",
  seedlingNum: "Seedling number",
  parentage: "Parentage",
  ploidy: "Ploidy",
  scapeHeight: "Scape height",
  color: "Color",
  bloomHabit: "Bloom habit",
  bloomSeason: "Bloom season",
  rebloom: "Rebloom",
  bloomSize: "Bloom size",
  branches: "Branches",
  budcount: "Bud count",
  flower: "Flower",
  foliage: "Foliage",
  foliageType: "Foliage type",
  form: "Form",
  fragrance: "Fragrance",
  sculpting: "Sculpting",
} as const;

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { listingSlug } = await params;
  const snapshot = await getStorefrontSnapshot();
  const listing = findStorefrontListingBySlug(snapshot, listingSlug);
  if (!listing) {
    return {
      title: "Daylily not found",
    };
  }
  const description = (
    listing.description ??
    `${listing.title} daylily cultivar details and availability.`
  ).slice(0, 160);
  const image = getFirstStorefrontImage(listing.images);
  return {
    title: `${listing.title} Daylily`,
    description,
    alternates: { canonical: `/${listing.slug}` },
    openGraph: {
      type: "website",
      title: `${listing.title} Daylily`,
      description,
      url: `/${listing.slug}`,
      ...(image
        ? { images: [{ url: image.url, alt: `${listing.title} daylily` }] }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${listing.title} Daylily`,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { listingSlug } = await params;
  const [snapshot, site] = await Promise.all([
    getStorefrontSnapshot(),
    Promise.resolve(getStorefrontSiteConfig()),
  ]);
  const listing = findStorefrontListingBySlug(snapshot, listingSlug);
  if (!listing) notFound();

  const lists = snapshot.lists.filter((list) =>
    list.listingIds.includes(listing.id),
  );
  const isForSale = listing.price !== null && listing.price > 0;
  const images = getOrderedStorefrontImages(listing.images);
  const details = listing.cultivar?.details;
  const traits = details
    ? Object.entries(traitLabels).flatMap(([key, label]) => {
        const value = details[key as keyof typeof traitLabels];
        if (value === null || value === "") return [];
        return [
          {
            label,
            value: typeof value === "boolean" ? (value ? "Yes" : "No") : value,
          },
        ];
      })
    : [];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${listing.title} Daylily`,
    description: listing.description ?? `${listing.title} daylily cultivar`,
    url: new URL(`/${listing.slug}`, site.canonicalUrl).toString(),
    ...(images.length ? { image: images.map((image) => image.url) } : {}),
    sku: listing.id,
    brand: { "@type": "Brand", name: site.brand.name },
    ...(isForSale
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: listing.price,
            url: new URL(`/${listing.slug}`, site.canonicalUrl).toString(),
          },
        }
      : {}),
  };

  return (
    <article className="grid gap-10 py-8 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <ImageGallery images={images} title={listing.title} />

        <div className="grid gap-6">
          <div className="grid gap-3">
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              Daylily
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight lg:text-6xl">
              {listing.title}
            </h1>
            <p className="text-primary text-2xl font-semibold">
              {isForSale ? formatCurrency(listing.price!) : "Display only"}
            </p>
          </div>

          {lists.length ? (
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => (
                <Link key={list.id} href={`/catalog/${list.slug}`}>
                  <Badge variant="secondary">{list.title}</Badge>
                </Link>
              ))}
            </div>
          ) : null}

          {listing.description ? (
            <p className="text-muted-foreground text-lg leading-8">
              {listing.description}
            </p>
          ) : null}
          <p className="text-muted-foreground text-sm">
            Updated {formatDate(listing.updatedAt)}
          </p>

          {isForSale ? (
            <AddToCartButton
              product={{
                id: listing.id,
                slug: listing.slug,
                title: listing.title,
                price: listing.price!,
                imageUrl: images.at(0)
                  ? getStorefrontThumbnailUrl(images[0]!)
                  : undefined,
                isForSale: true,
              }}
            />
          ) : (
            <LinkButton href="/contact">Ask about this daylily</LinkButton>
          )}
        </div>
      </div>

      {traits.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-3xl">
              Cultivar details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
              {traits.map((trait) => (
                <div
                  key={trait.label}
                  className="grid grid-cols-[minmax(8rem,1fr)_minmax(0,2fr)] gap-4 border-b py-3"
                >
                  <dt className="font-medium">{trait.label}</dt>
                  <dd className="text-muted-foreground">
                    {String(trait.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <aside className="bg-muted/40 rounded-xl border p-6">
        <h2 className="font-serif text-2xl font-semibold">
          Explore cultivar records
        </h2>
        <p className="text-muted-foreground mt-2">
          Compare public listings and cultivar information in Daylily Catalog.
        </p>
        <LinkButton
          href="https://daylilycatalog.com"
          variant="outline"
          className="mt-4"
          external
        >
          Open Daylily Catalog{" "}
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </LinkButton>
      </aside>

      <JsonLd value={productJsonLd} />
    </article>
  );
}
