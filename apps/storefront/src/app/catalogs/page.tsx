import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@daylily-catalog/ui/components/card";
import { ArrowRight, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { StorefrontImageView } from "@/components/catalog/storefront-image";
import { LinkButton } from "@/components/layout/link-button";
import { getFirstStorefrontImage } from "@/lib/storefront-images";
import { getStorefrontSnapshot } from "@/server/storefront";
import { getStorefrontListingsForList } from "@/types/storefront-query";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Catalogs",
    description:
      "Browse public daylily lists, plants for sale, and the complete collection.",
    alternates: { canonical: "/catalogs" },
  };
}

export default async function CatalogsPage() {
  await connection();
  const snapshot = await getStorefrontSnapshot();
  const lists = [...snapshot.lists].sort(
    (left, right) => right.listingIds.length - left.listingIds.length,
  );
  const forSale = snapshot.listings.filter(
    (listing) => listing.price !== null && listing.price > 0,
  );
  const cards = [
    {
      href: "/catalog/for-sale",
      title: "Daylilies for sale",
      description: "Every public listing with a current price.",
      count: forSale.length,
      image: getFirstStorefrontImage(forSale.at(0)?.images ?? []),
    },
    ...lists.map((list) => {
      const listings = getStorefrontListingsForList(snapshot, list);
      return {
        href: `/catalog/${list.slug}`,
        title: list.title,
        description: list.description ?? "A public garden list.",
        count: listings.length,
        image: getFirstStorefrontImage(listings.at(0)?.images ?? []),
      };
    }),
    {
      href: "/catalog/all",
      title: "All daylilies",
      description:
        "The complete public collection, including plants that are not in a list.",
      count: snapshot.listings.length,
      image: getFirstStorefrontImage(snapshot.listings.at(0)?.images ?? []),
    },
  ];

  return (
    <div className="grid gap-8 py-8 lg:py-14">
      <header className="grid max-w-3xl gap-3">
        <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
          Browse
        </p>
        <h1 className="font-serif text-4xl font-semibold lg:text-6xl">
          Catalogs
        </h1>
        <p className="text-muted-foreground text-lg">
          Start with a public list, browse plants for sale, or search the full
          collection.
        </p>
        <LinkButton href="/catalog/search" className="mt-2 justify-self-start">
          <Search data-icon="inline-start" aria-hidden="true" />
          Search all daylilies
        </LinkButton>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <Card key={card.href} className="overflow-hidden py-0">
            <div className="bg-muted relative block aspect-[4/3]">
              {card.image ? (
                <StorefrontImageView
                  image={card.image}
                  alt=""
                  sizes="(min-width: 1280px) 384px, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, calc(100vw - 2rem)"
                  priority={index < 3}
                />
              ) : null}
            </div>
            <CardHeader className="px-5">
              <CardTitle className="font-serif text-2xl">
                <Link href={card.href} className="hover:underline">
                  {card.title}
                </Link>
              </CardTitle>
              <p className="text-primary text-sm font-medium">
                {card.count.toLocaleString()}{" "}
                {card.count === 1 ? "daylily" : "daylilies"}
              </p>
            </CardHeader>
            <CardContent className="text-muted-foreground px-5 text-sm leading-6">
              {card.description}
            </CardContent>
            <CardFooter className="px-5 pb-5">
              <LinkButton href={card.href} variant="outline" className="w-full">
                <span className="sr-only">Browse {card.title} catalog</span>
                <span aria-hidden="true">Browse catalog</span>{" "}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </LinkButton>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
