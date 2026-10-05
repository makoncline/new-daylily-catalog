"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";
import { ListMissingState } from "@/components/list-missing-state";
import { ListListingsTable } from "./_components/list-listings-table";
import { PageHeader } from "../../_components/page-header";
import { ListForm, type ListFormHandle } from "@/components/forms/list-form";
import { AddListingsSection } from "./_components/add-listings-section";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";
import { useListResource } from "@/app/dashboard/_lib/dashboard-db/use-list-resource";
import { loadMissingList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";

interface ListPageProps {
  params: Promise<{
    listId: string;
  }>;
}

export default function ListPage({ params }: ListPageProps) {
  const { listId } = React.use(params);

  return <ManageListPageLive listId={listId} />;
}

export function ManageListPageLive({ listId }: { listId: string }) {
  const formRef = React.useRef<ListFormHandle | null>(null);
  useSaveBeforeNavigate(formRef, "navigate");
  const markListNeedsCommit = React.useCallback(() => {
    formRef.current?.markNeedsCommit();
  }, []);

  const { isReady, list } = useListResource(listId);
  const [unavailableId, setUnavailableId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!isReady || list || unavailableId === listId) return;
    let active = true;
    void loadMissingList(listId).catch(() => {
      if (active) setUnavailableId(listId);
    });
    return () => {
      active = false;
    };
  }, [isReady, list, listId, unavailableId]);

  if (!isReady || (!list && unavailableId !== listId)) {
    return <ListFormSkeleton />;
  }
  if (!list) {
    return <ListMissingState />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        heading={`Manage List: ${list.title}`}
        text="Manage list details and organize your listings."
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/lists">
            <ArrowLeft data-icon="inline-start" />
            Back to lists
          </Link>
        </Button>
      </PageHeader>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ListForm listId={listId} formRef={formRef} />
        </div>
        <AddListingsSection
          listId={listId}
          onMutationSuccess={markListNeedsCommit}
        />
      </div>
      <ListListingsTable
        listId={listId}
        onMutationSuccess={markListNeedsCommit}
      />
    </div>
  );
}
