"use client";

import { useCallback, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  readCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import { usePro } from "@/hooks/use-pro";
import { DashboardCatalogImporter } from "./dashboard-catalog-importer";
import { DashboardImportProGate } from "./dashboard-import-pro-gate";

export function DashboardCatalogImporterClient() {
  const { isLoading: isSubscriptionLoading, isPro } = usePro();
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
    <div
      id="dashboard-catalog-import-workflow"
      ref={loadDraft}
      className="scroll-mt-4"
    >
      {initialDraft === undefined || isSubscriptionLoading ? (
        <p
          className="text-muted-foreground flex items-center gap-2 py-8 text-sm"
          role="status"
        >
          <Spinner />
          Checking your import…
        </p>
      ) : !isPro ? (
        <DashboardImportProGate initialDraft={initialDraft} />
      ) : (
        <DashboardCatalogImporter initialDraft={initialDraft} />
      )}
    </div>
  );
}
