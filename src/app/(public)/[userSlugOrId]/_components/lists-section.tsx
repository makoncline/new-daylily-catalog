"use client";

import * as React from "react";
import { type RouterOutputs } from "@/trpc/react";
import { type Column, type Table } from "@tanstack/react-table";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { H2, P } from "@/components/typography";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];
type ProfileLists = NonNullable<Profile>["lists"];

interface ListsSectionProps {
  lists: ProfileLists;
  column?: Column<Listing>;
  table: Table<Listing>;
}

export function ListsSection({ lists, column, table }: ListsSectionProps) {
  const handleListClick = React.useCallback(
    (listId: string) => {
      if (!column) return;

      // Check if list is already selected
      const isSelected = (column.getFilterValue() as string[])?.includes(
        listId,
      );

      // Update column filters while preserving others
      const currentFilters = table.getState().columnFilters;
      const otherFilters = currentFilters.filter((f) => f.id !== "lists");
      const newColumnFilters = [
        ...otherFilters,
        ...(isSelected ? [] : [{ id: "lists", value: [listId] }]),
      ];

      // Update state while preserving everything except what we're explicitly changing
      table.setState((old) => ({
        ...old,
        columnFilters: newColumnFilters,
        pagination: {
          ...old.pagination,
          pageIndex: 0,
        },
      }));

      // Navigate to listings section if selecting a list
      if (!isSelected) {
        const listingsSection = document.getElementById("listings");
        listingsSection?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [column, table],
  );

  if (!lists.length || !column) return null;

  const filterValue = column.getFilterValue() as string[];

  return (
    <div id="lists" data-testid="lists-section" className="space-y-6">
      <H2 className="text-2xl">Lists</H2>
      <div className="grid gap-4 sm:grid-cols-2">
        {lists.map((list) => {
          const isSelected = filterValue?.includes(list.id);

          return (
            <Card
              key={list.id}
              className={cn(
                "group cursor-pointer transition-all hover:shadow-md",
                isSelected && "bg-muted",
              )}
              onClick={() => handleListClick(list.id)}
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
