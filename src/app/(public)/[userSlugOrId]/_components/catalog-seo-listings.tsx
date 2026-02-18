import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { H2, Muted, P } from "@/components/typography";
import { getPublicProfilePagePath } from "@/lib/public-catalog-url-state";
import { type RouterOutputs } from "@/trpc/react";
import { CatalogSeoListingsGrid } from "./catalog-seo-listings-grid";

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
  searchQueryString: string;
}

export function CatalogSeoListings({
  canonicalUserSlug,
  listings,
  profileLists,
  page,
  totalPages,
  totalCount,
  searchQueryString,
}: CatalogSeoListingsProps) {
  const searchHref = searchQueryString
    ? `/${canonicalUserSlug}/catalog?${searchQueryString}`
    : `/${canonicalUserSlug}/catalog`;

  const prevHref = getPublicProfilePagePath(canonicalUserSlug, Math.max(1, page - 1));
  const nextHref = getPublicProfilePagePath(canonicalUserSlug, Math.min(totalPages, page + 1));

  return (
    <div className="space-y-8">
      <div id="lists" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <H2 className="text-2xl">Lists</H2>
          <Button asChild size="sm" variant="outline">
            <Link href={searchHref}>Open Catalog Search</Link>
          </Button>
        </div>

        {profileLists.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {profileLists.map((list) => (
              <Link
                key={list.id}
                href={`/${canonicalUserSlug}/catalog?lists=${encodeURIComponent(list.id)}`}
              >
                <Card className="group h-full transition-all hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-lg font-semibold group-hover:text-primary">
                      {list.title}
                    </CardTitle>
                    <Badge variant="secondary" className="h-7">
                      {list.listingCount} listings
                    </Badge>
                  </CardHeader>
                  {list.description && (
                    <CardContent>
                      <P className="line-clamp-2 leading-relaxed text-muted-foreground">
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
        <div className="flex items-center justify-between gap-3">
          <H2 className="text-2xl">Listings</H2>
          <Muted>
            {totalCount.toLocaleString()} total{totalPages > 1 ? `, page ${page} of ${totalPages}` : ""}
          </Muted>
        </div>

        {listings.length > 0 ? (
          <CatalogSeoListingsGrid listings={listings} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Muted>No listings available.</Muted>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" disabled={page <= 1} data-testid="legacy-page-prev">
            <Link href={prevHref}>Previous</Link>
          </Button>

          <span className="text-sm text-muted-foreground" data-testid="legacy-page-indicator">
            Page {page} of {totalPages}
          </span>

          <Button
            asChild
            variant="outline"
            disabled={page >= totalPages}
            data-testid="legacy-page-next"
          >
            <Link href={nextHref}>Next</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
