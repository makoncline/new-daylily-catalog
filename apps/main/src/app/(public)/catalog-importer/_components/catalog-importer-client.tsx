"use client";

import { useCallback, useRef, useState } from "react";
import { CatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_components/catalog-importer-workbench";
import {
  readCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";

export function CatalogImporterClient({
  showMembershipPrompts = true,
}: {
  showMembershipPrompts?: boolean;
}) {
  const startedLoading = useRef(false);
  const [initialDraft, setInitialDraft] = useState<
    CatalogImporterDraft | null | undefined
  >(undefined);
  const loadDraft = useCallback((node: HTMLDivElement | null) => {
    if (!node || startedLoading.current) {
      return;
    }

    startedLoading.current = true;
    void readCatalogImporterDraft()
      .then(setInitialDraft)
      .catch(() => setInitialDraft(null));
  }, []);

  return (
    <div ref={loadDraft}>
      {initialDraft === undefined ? (
        <div
          className="text-muted-foreground border-y py-6 text-sm"
          role="status"
        >
          Loading spreadsheet tools…
        </div>
      ) : (
        <CatalogImporterWorkbench
          initialDraft={initialDraft}
          showMembershipPrompts={showMembershipPrompts}
        />
      )}
    </div>
  );
}
