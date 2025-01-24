"use client";

import { type RouterOutputs } from "@/trpc/react";
import { type Table } from "@tanstack/react-table";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Listing = RouterOutputs["public"]["getListings"][number];

interface ListsSectionProps {
  lists: RouterOutputs["public"]["getProfile"]["lists"];
  table: Table<Listing>;
}

export function ListsSection({ lists, table }: ListsSectionProps) {
  if (!lists?.length) return null;

  const listColumn = table.getColumn("lists");
  if (!listColumn) return null;

  return (
    <div id="lists" className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Lists</h2>
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
                <div className="flex items-center space-x-2">
                  <ListIcon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg font-semibold group-hover:text-primary">
                    {list.title}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="h-7">
                  {list.listingCount} listings
                </Badge>
              </CardHeader>
              {list.description && (
                <CardContent>
                  <p className="line-clamp-2 leading-relaxed text-muted-foreground">
                    {list.description}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
