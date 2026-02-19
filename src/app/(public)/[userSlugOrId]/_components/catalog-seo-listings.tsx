import Link from "next/link";
import { type RouterOutputs } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { H2, Muted, P } from "@/components/typography";
import { CatalogSeoListingsGrid } from "./catalog-seo-listings-grid";
import { CatalogSeoPagination } from "./catalog-seo-pagination";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];
type ProfileLists = NonNullable<Profile>["lists"];

interface CatalogSeoListingsProps {
  canonicalUserSlug: string;
  listings: Listing[];
  profileLists: ProfileLists;
  page: number;
  totalPages: number;
  totalCount: number;
}

export function CatalogSeoListings({
  canonicalUserSlug,
  listings,
  profileLists,
  page,
  totalPages,
  totalCount,
}: CatalogSeoListingsProps) {
  const searchHref =
    page > 1
      ? `/${canonicalUserSlug}/search?page=${page}`
      : `/${canonicalUserSlug}/search`;

  return (
    <div className="space-y-8">
      <div id="lists" className="space-y-4">
        <H2 className="text-2xl">Lists</H2>

        {profileLists.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {profileLists.map((list) => (
              <Link
                key={list.id}
                href={`/${canonicalUserSlug}/search?lists=${encodeURIComponent(list.id)}`}
              >
                <Card className="group h-full transition-all hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="group-hover:text-primary text-lg font-semibold">
                      {list.title}
                    </CardTitle>
                    <Badge variant="secondary" className="h-7">
                      {list.listingCount} listings
                    </Badge>
                  </CardHeader>
                  {list.description && (
                    <CardContent>
                      <P className="text-muted-foreground line-clamp-2 leading-relaxed">
                        {list.description}
                      </P>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Muted>No lists available.</Muted>
        )}
      </div>

      <div id="listings" className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <H2 className="text-2xl">Listings</H2>
              <Muted>{totalCount.toLocaleString()} total</Muted>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href={searchHref}>Search and filter listings</Link>
            </Button>
          </div>
        </div>

        {listings.length > 0 ? (
          <CatalogSeoListingsGrid listings={listings} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Muted>No listings available.</Muted>
          </div>
        )}

        <div className="flex justify-start">
          <CatalogSeoPagination
            canonicalUserSlug={canonicalUserSlug}
            page={page}
            totalPages={totalPages}
            prevTestId="legacy-page-prev"
            indicatorTestId="legacy-page-indicator"
            nextTestId="legacy-page-next"
            goToPageTestId="legacy-page-go-to"
          />
        </div>
      </div>
    </div>
  );
}
