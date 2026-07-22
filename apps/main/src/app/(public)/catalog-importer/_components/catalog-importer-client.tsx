"use client";

import { useCallback, useRef, useState } from "react";
import { CatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_components/catalog-importer-workbench";
import { Spinner } from "@/components/ui/spinner";
import {
  readCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import type { CatalogImporterViewerState } from "@/lib/catalog-importer-membership";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";

export function CatalogImporterClient({
  membershipPriceDisplay = null,
  membershipStarted = false,
  viewerState = "anonymous",
}: {
  membershipPriceDisplay?: MembershipPriceDisplay | null;
  membershipStarted?: boolean;
  viewerState?: CatalogImporterViewerState;
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
          className="text-muted-foreground flex items-center gap-2 py-4 text-sm"
          role="status"
        >
          <Spinner />
          Loading spreadsheet tools…
        </div>
      ) : (
        <CatalogImporterWorkbench
          initialDraft={initialDraft}
          membershipPriceDisplay={membershipPriceDisplay}
          membershipStarted={membershipStarted}
          viewerState={viewerState}
        />
      )}
    </div>
  );
}
