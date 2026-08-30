import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@daylily-catalog/ui/components/card";
import {
  ArrowRight,
  MapPin,
  MessageCircle,
  PackageCheck,
  Sprout,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";

import { ContactForm } from "@/components/contact-form";
import { StorefrontImageView } from "@/components/catalog/storefront-image";
import { LinkButton } from "@/components/layout/link-button";
import { PublicStory } from "@/components/public-story";
import { getStorefrontSiteConfig } from "@/config/storefront-site-config";
import { formatCurrency } from "@/lib/format";
import { getOrderedStorefrontImages } from "@/lib/storefront-images";
import { getStorefrontSnapshot } from "@/server/storefront";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const site = getStorefrontSiteConfig();
  return {
    title: { absolute: site.brand.title },
    description: site.brand.description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      title: site.brand.title,
      description: site.brand.description,
      url: "/",
      ...(site.brand.socialImage
        ? {
            images: [
              {
                url: site.brand.socialImage.path,
                width: site.brand.socialImage.width,
                height: site.brand.socialImage.height,
                type: site.brand.socialImage.type,
                alt: `${site.brand.name} logo`,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function HomePage() {
  await connection();
  const site = getStorefrontSiteConfig();
  const snapshot = await getStorefrontSnapshot(site);
  const profile = snapshot.seller.profile;
  const trimmedProfileTitle = profile?.title?.trim();
  const trimmedProfileDescription = profile?.description?.trim();
  const profileTitle =
    trimmedProfileTitle === undefined || trimmedProfileTitle === ""
      ? site.brand.name
      : trimmedProfileTitle;
  const profileDescription =
    trimmedProfileDescription === undefined || trimmedProfileDescription === ""
      ? site.brand.description
      : trimmedProfileDescription;
  const configuredHomeImages = site.brand.homeImagePaths.map((url, order) => ({
    id: `brand-home-${order + 1}`,
    url,
    thumbUrl: url,
    blurUrl: null,
    order,
  }));
  const profileImages = getOrderedStorefrontImages(
    configuredHomeImages.length > 0
      ? configuredHomeImages
      : (profile?.images ?? []),
  );
  const heroImage = profileImages.at(0);

  return (
    <div className="grid gap-16 py-8 lg:gap-24 lg:py-14">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,1.2fr)] lg:items-center">
        <div className="grid gap-6">
          <div className="flex items-center gap-4">
            {site.brand.logoPath ? (
              <Image
                src={site.brand.logoPath}
                alt={`${site.brand.name} logo`}
                width={112}
                height={112}
                className="size-24 rounded-2xl"
                priority
              />
            ) : null}
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              A grower-owned collection
            </p>
          </div>
          <h1 className="font-serif text-5xl font-semibold tracking-tight lg:text-7xl">
            {profileTitle}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg leading-8">
            {profileDescription}
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/catalog/for-sale">
              Browse daylilies for sale{" "}
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </LinkButton>
            <LinkButton href="/catalogs" variant="outline">
              View all catalogs
            </LinkButton>
          </div>
        </div>
        <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-2xl border shadow-xl">
          {heroImage ? (
            <StorefrontImageView
              image={heroImage}
              alt={`${site.brand.name} garden view 1`}
              sizes="(min-width: 1280px) 646px, (min-width: 1024px) 55vw, calc(100vw - 2rem)"
              priority
            />
          ) : site.brand.logoPath ? (
            <Image
              src={site.brand.logoPath}
              alt={`${site.brand.name} logo`}
              fill
              sizes="(min-width: 1280px) 646px, (min-width: 1024px) 55vw, calc(100vw - 2rem)"
              className="object-contain p-10"
              priority
            />
          ) : (
            <div className="grid size-full place-items-center p-8 text-center font-serif text-4xl font-semibold">
              {site.brand.name}
            </div>
          )}
        </div>
      </section>

      {site.commerce.rustNotice ? (
        <aside className="bg-muted/40 grid gap-2 rounded-xl border p-5">
          <h2 className="font-serif text-2xl font-semibold">
            Plant health notice
          </h2>
          <p className="text-muted-foreground leading-7">
            {site.commerce.rustNotice.text}{" "}
            <a
              href={site.commerce.rustNotice.url}
              className="text-foreground underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              Learn about daylily rust.
            </a>
          </p>
        </aside>
      ) : null}

      {profileImages.length > 1 ? (
        <section
          className="grid gap-4 sm:grid-cols-2"
          aria-label={`${site.brand.name} garden views`}
        >
          {profileImages.slice(1).map((image, index) => (
            <div
              key={image.id}
              className="bg-muted relative aspect-[4/3] overflow-hidden rounded-2xl border"
            >
              <StorefrontImageView
                image={image}
                alt={`${site.brand.name} garden view ${index + 2}`}
                sizes="(min-width: 1280px) 600px, (min-width: 640px) calc(50vw - 2rem), calc(100vw - 2rem)"
              />
            </div>
          ))}
        </section>
      ) : null}

      <PublicStory content={profile?.content ?? null} />

      <section
        className="grid gap-6 lg:grid-cols-3"
        aria-labelledby="store-details-heading"
      >
        <h2 id="store-details-heading" className="sr-only">
          Store details
        </h2>
        <Card>
          <CardHeader>
            <Sprout className="text-primary size-7" aria-hidden="true" />
            <CardTitle className="font-serif text-2xl">
              The collection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-7">
            Browse {snapshot.listings.length.toLocaleString()} public listings,
            including named cultivars, seedlings, and display-only plants.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <PackageCheck className="text-primary size-7" aria-hidden="true" />
            <CardTitle className="font-serif text-2xl">Ordering</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-7">
            {site.commerce.orderingCopy ??
              `The minimum plant order is ${formatCurrency(site.commerce.minimumOrder)}. Contact the seller before payment.`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <MessageCircle className="text-primary size-7" aria-hidden="true" />
            <CardTitle className="font-serif text-2xl">Shipping</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-7">
            {site.commerce.shippingCopy ??
              `${formatCurrency(site.commerce.shipping.baseRate)} ships the first ${site.commerce.shipping.baseItems} plants. Each additional plant is ${formatCurrency(site.commerce.shipping.additionalItemRate)}.`}
          </CardContent>
        </Card>
      </section>

      <section
        className="bg-card grid gap-8 rounded-2xl border p-6 shadow-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)] lg:p-10"
        id="contact"
      >
        <div className="grid gap-5">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Get in touch
          </p>
          <h2 className="font-serif text-4xl font-semibold">
            Ask about a daylily
          </h2>
          <p className="text-muted-foreground">
            Send a message about availability, ordering, or a garden visit.
          </p>
          <ContactForm />
        </div>
        <aside className="bg-muted/50 grid content-start gap-5 rounded-xl p-6">
          <h3 className="font-serif text-2xl font-semibold">Visit or call</h3>
          {profile?.location ? (
            <p className="flex gap-2">
              <MapPin
                className="text-primary mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              {profile.location}
            </p>
          ) : null}
          {site.contact.phone ? (
            <a
              className="underline underline-offset-4"
              href={`tel:${site.contact.phone}`}
            >
              {site.contact.phone}
            </a>
          ) : null}
          {site.contact.email ? (
            <a
              className="underline underline-offset-4"
              href={`mailto:${site.contact.email}`}
            >
              {site.contact.email}
            </a>
          ) : null}
          {site.contact.mapsUrl ? (
            <LinkButton href={site.contact.mapsUrl} variant="outline" external>
              <MapPin data-icon="inline-start" aria-hidden="true" />
              Get directions
            </LinkButton>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
