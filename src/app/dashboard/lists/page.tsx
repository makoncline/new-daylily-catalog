"use server";

import { Suspense } from "react";
import { api } from "@/trpc/server";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateListButton } from "./_components/create-list-button";
import { ListsTable } from "./_components/lists-table";

async function ListsContent() {
  // Get initial data from server
  const initialLists = await api.list.list();
  return <ListsTable initialLists={initialLists} />;
}

export default async function ListsPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lists</h1>
          <p className="mt-2 text-muted-foreground">
            Organize your daylilies into collections.
          </p>
        </div>
        <CreateListButton />
      </div>

      <div className="mt-8">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-[500px] w-full" />
            </div>
          }
        >
          <ListsContent />
        </Suspense>
      </div>
    </div>
  );
}
