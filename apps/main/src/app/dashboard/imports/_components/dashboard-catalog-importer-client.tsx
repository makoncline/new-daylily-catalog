"use client";

import { useCallback, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  readCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import { DashboardCatalogImporter } from "./dashboard-catalog-importer";

export function DashboardCatalogImporterClient() {
  const startedLoading = useRef(false);
  const [initialDraft, setInitialDraft] = useState<
    CatalogImporterDraft | null | undefined
  >(undefined);
  const loadDraft = useCallback((node: HTMLDivElement | null) => {
    if (!node || startedLoading.current) return;

    startedLoading.current = true;
    void readCatalogImporterDraft()
      .then(setInitialDraft)
      .catch(() => setInitialDraft(null));
  }, []);

  return (
    <div ref={loadDraft}>
      {initialDraft === undefined ? (
        <p
          className="text-muted-foreground flex items-center gap-2 py-8 text-sm"
          role="status"
        >
          <Spinner />
          Restoring your catalog project…
        </p>
      ) : (
        <DashboardCatalogImporter initialDraft={initialDraft} />
      )}
    </div>
  );
}
