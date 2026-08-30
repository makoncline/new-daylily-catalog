import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@daylily-catalog/ui/components/card";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { LinkButton } from "@/components/layout/link-button";
import { getStorefrontSiteConfig } from "@/config/storefront-site-config";

function getPageDescription(siteName: string) {
  return `Read daylily stories and cultivar notes from ${siteName}.`;
}

const post = {
  title: "Dorothy and Toto",
  href: "/blog/dorothy-and-toto",
  description:
    "Learn about the background, garden performance, characteristics, and awards of the Dorothy and Toto daylily.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const site = getStorefrontSiteConfig();
  const title = `${site.brand.shortName} Blog`;
  const description = getPageDescription(site.brand.name);

  return {
    title: "Blog",
    description,
    alternates: { canonical: "/blog" },
    openGraph: {
      type: "website",
      siteName: site.brand.name,
      title,
      description,
      url: "/blog",
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
      description,
      ...(site.brand.socialImage
        ? { images: [site.brand.socialImage.path] }
        : {}),
    },
  };
}

export default async function BlogPage() {
  await connection();
  const site = getStorefrontSiteConfig();

  return (
    <div className="grid gap-8 py-8 lg:py-14">
      <header className="grid max-w-3xl gap-3">
        <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
          From the garden
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight lg:text-6xl">
          Blog
        </h1>
        <p className="text-muted-foreground text-lg leading-8">
          Daylily stories, plant profiles, and notes from {site.brand.shortName}
          .
        </p>
      </header>

      <Card className="max-w-4xl">
        <CardHeader className="grid gap-3">
          <p className="text-primary text-sm font-semibold tracking-[0.16em] uppercase">
            Daylily profile
          </p>
          <CardTitle className="font-serif text-3xl">
            <Link href={post.href} className="hover:underline">
              {post.title}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-7">{post.description}</p>
        </CardContent>
        <CardFooter>
          <LinkButton href={post.href} variant="outline">
            Read Dorothy and Toto
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </LinkButton>
        </CardFooter>
      </Card>
    </div>
  );
}
