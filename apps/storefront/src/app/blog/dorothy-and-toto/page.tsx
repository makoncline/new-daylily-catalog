import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { JsonLd } from "@/components/seo/json-ld";
import { getStorefrontSiteConfig } from "@/config/storefront-site-config";

const title = "Dorothy and Toto";
const pagePath = "/blog/dorothy-and-toto";
const pageDescription =
  "Learn about Dorothy and Toto, a fragrant, reblooming double daylily introduced by Herrington-K., including its characteristics, parentage, and awards.";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const site = getStorefrontSiteConfig();

  return {
    title,
    description: pageDescription,
    alternates: { canonical: pagePath },
    openGraph: {
      type: "article",
      siteName: site.brand.name,
      title,
      description: pageDescription,
      url: pagePath,
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
    twitter: {
      card: "summary",
      title,
      description: pageDescription,
      ...(site.brand.socialImage
        ? { images: [site.brand.socialImage.path] }
        : {}),
    },
  };
}

export default async function DorothyAndTotoPage() {
  await connection();
  const site = getStorefrontSiteConfig();
  const pageUrl = new URL(pagePath, site.canonicalUrl).toString();
  const blogUrl = new URL("/blog", site.canonicalUrl).toString();
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: pageDescription,
    url: pageUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    isPartOf: {
      "@type": "Blog",
      name: `${site.brand.name} Blog`,
      url: blogUrl,
    },
    publisher: {
      "@type": "Organization",
      name: site.brand.name,
      url: site.canonicalUrl,
      ...(site.brand.logoPath
        ? {
            logo: {
              "@type": "ImageObject",
              url: new URL(site.brand.logoPath, site.canonicalUrl).toString(),
            },
          }
        : {}),
    },
    inLanguage: "en-US",
  };

  return (
    <div className="py-8 lg:py-14">
      <article className="mx-auto grid w-full max-w-3xl gap-10">
        <header className="grid gap-4">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to the blog
          </Link>
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Daylily profile
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight lg:text-6xl">
            Dorothy and Toto
          </h1>
        </header>

        <div className="grid gap-10">
          <section
            aria-labelledby="introduction-heading"
            className="grid gap-3"
          >
            <h2
              id="introduction-heading"
              className="font-serif text-3xl font-semibold"
            >
              Introduction
            </h2>
            <p className="text-muted-foreground text-lg leading-8">
              Dorothy and Toto is a stunning daylily that was introduced in 2003
              by Herrington-K. It has won several awards, including the Stout
              Silver Medal in 2015, and is highly regarded by daylily
              enthusiasts.
            </p>
          </section>

          <section aria-labelledby="description-heading" className="grid gap-3">
            <h2
              id="description-heading"
              className="font-serif text-3xl font-semibold"
            >
              Description
            </h2>
            <p className="text-muted-foreground text-lg leading-8">
              Dorothy and Toto is a semi-evergreen daylily that blooms in
              mid-season and reblooms. It grows up to 30 inches tall and has 22
              buds on 5 branches. The 6-inch double blooms are fragrant and a
              mix of rose, peach, and cream. The green throat of the flower
              provides an excellent contrast to the blooms’ colors.
            </p>
          </section>

          <section aria-labelledby="history-heading" className="grid gap-3">
            <h2
              id="history-heading"
              className="font-serif text-3xl font-semibold"
            >
              Background History
            </h2>
            <p className="text-muted-foreground text-lg leading-8">
              Dorothy and Toto is a hybrid of Night Embers and (Victoria’s
              Secret X sdlg). It has earned several awards from the American
              Hemerocallis Society, including the Stout Silver Medal in 2015,
              the Award of Merit in 2012, and the Honorable Mention in 2009.
            </p>
          </section>

          <section aria-labelledby="photos-heading" className="grid gap-4">
            <h2
              id="photos-heading"
              className="font-serif text-3xl font-semibold"
            >
              Photos
            </h2>
            <p className="text-muted-foreground text-lg leading-8">
              Here are some stunning photos of the Dorothy and Toto daylily:
            </p>
            <aside className="bg-muted/40 grid gap-4 rounded-xl border p-6">
              <p className="font-medium">
                The original article included third-party photographs. They are
                not republished here.
              </p>
              <p className="text-muted-foreground text-sm font-semibold tracking-[0.12em] uppercase">
                Original photo captions
              </p>
              <ul className="text-muted-foreground grid list-disc gap-3 pl-5 leading-7">
                <li>A beautiful photo of the Dorothy and Toto daylily.</li>
                <li>
                  A photo of the Dorothy and Toto daylily with other daylilies
                  in the background.
                </li>
                <li>
                  A close-up of the beautiful blooms of the Dorothy and Toto
                  daylily.
                </li>
              </ul>
            </aside>
          </section>

          <section aria-labelledby="conclusion-heading" className="grid gap-3">
            <h2
              id="conclusion-heading"
              className="font-serif text-3xl font-semibold"
            >
              Conclusion
            </h2>
            <p className="text-muted-foreground text-lg leading-8">
              The Dorothy and Toto daylily is a must-have for any daylily
              enthusiast. Its beautiful blooms, pleasant fragrance, and multiple
              awards make it an excellent addition to any garden. If you’re
              looking for a daylily that is both beautiful and easy to care for,
              you can’t go wrong with Dorothy and Toto.
            </p>
          </section>
        </div>
      </article>
      <JsonLd value={article} />
    </div>
  );
}
