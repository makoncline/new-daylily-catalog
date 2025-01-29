"use client";

import { type RouterOutputs } from "@/trpc/react";
import { type Table } from "@tanstack/react-table";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, P } from "@/components/typography";

type Listing = RouterOutputs["public"]["getListings"][number];
type List = RouterOutputs["public"]["getProfile"]["lists"][number];

interface ListsSectionProps {
  lists: List[];
  table: Table<Listing>;
}

export function ListsSection({ lists, table }: ListsSectionProps) {
  if (!lists?.length) return null;

  const listColumn = table.getColumn("lists");
  if (!listColumn) return null;

  return (
    <div id="lists" className="space-y-6">
      <H2 className="text-2xl">Lists</H2>
      <div className="grid gap-4 sm:grid-cols-2">
        {lists.map((list) => {
          const isSelected = (
            listColumn.getFilterValue() as string[]
          )?.includes(list.id);

          return (
            <Card
              key={list.id}
              className={cn(
                "group cursor-pointer transition-all hover:shadow-md",
                isSelected && "bg-muted",
              )}
              onClick={() => {
                if (isSelected) {
                  listColumn.setFilterValue([]);
                } else {
                  listColumn.setFilterValue([list.id]);
                }
              }}
            >
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
          );
        })}
      </div>
    </div>
  );
}

const ListCardSkeleton = () => {
  return <Skeleton className="h-[120px] w-full" />;
};

export function ListsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-[120px]" />
      <div className="grid gap-4 sm:grid-cols-2">
        <ListCardSkeleton />
        <ListCardSkeleton />
      </div>
    </div>
  );
}
