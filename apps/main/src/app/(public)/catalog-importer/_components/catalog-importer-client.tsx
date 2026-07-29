"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_components/catalog-importer-workbench";
import { Spinner } from "@/components/ui/spinner";
import {
  readCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import {
  catalogImporterViewerResponseSchema,
  type CatalogImporterViewerResolution,
} from "@/lib/catalog-importer-membership";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";

export function CatalogImporterClient({
  membershipPriceDisplay = null,
}: {
  membershipPriceDisplay?: MembershipPriceDisplay | null;
}) {
  const startedLoading = useRef(false);
  const [viewerResolution, setViewerResolution] =
    useState<CatalogImporterViewerResolution>({ status: "checking" });
  const [initialDraft, setInitialDraft] = useState<
    CatalogImporterDraft | null | undefined
  >(undefined);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/catalog-importer/viewer-state", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Viewer state request failed.");
        }
        const value = catalogImporterViewerResponseSchema.parse(
          await response.json(),
        );
        setViewerResolution({
          status: "ready",
          viewerState: value.viewerState,
        });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setViewerResolution({ status: "unavailable" });
        }
      });

    return () => controller.abort();
  }, []);
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
          viewerResolution={viewerResolution}
        />
      )}
    </div>
  );
}
