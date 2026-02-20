import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { H2, Muted, P } from "@/components/typography";

export interface CatalogListCardData {
  id: string;
  title: string;
  description: string | null;
  listingCount: number;
  listingCountLabel: string;
  href: string;
}

export interface CatalogListsSectionProps {
  lists: CatalogListCardData[];
  forSaleCount: number;
  forSaleCountLabel: string;
  forSaleHref: string;
}

export function CatalogListsSection({
  lists,
  forSaleCount,
  forSaleCountLabel,
  forSaleHref,
}: CatalogListsSectionProps) {
  return (
    <div id="lists" className="space-y-4">
      <H2 className="text-2xl">Lists</H2>

      {lists.length > 0 || forSaleCount > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {forSaleCount > 0 && (
            <Link href={forSaleHref} className="block h-full">
              <Card className="group h-full transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="group-hover:text-primary text-lg font-semibold">
                    For Sale
                  </CardTitle>
                  <Badge variant="secondary" className="h-7">
                    {forSaleCountLabel}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <P className="text-muted-foreground line-clamp-2 leading-relaxed">
                    Browse only listings currently marked for sale.
                  </P>
                </CardContent>
              </Card>
            </Link>
          )}

          {lists.map((list) => (
            <Link key={list.id} href={list.href} className="block h-full">
              <Card className="group h-full transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="group-hover:text-primary text-lg font-semibold">
                    {list.title}
                  </CardTitle>
                  <Badge variant="secondary" className="h-7">
                    {list.listingCountLabel}
                  </Badge>
                </CardHeader>
                {list.description ? (
                  <CardContent>
                    <P className="text-muted-foreground line-clamp-2 leading-relaxed">
                      {list.description}
                    </P>
                  </CardContent>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Muted>No lists available.</Muted>
      )}
    </div>
  );
}
