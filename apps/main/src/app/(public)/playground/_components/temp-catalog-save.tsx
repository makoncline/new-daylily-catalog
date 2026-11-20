"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ProUpgrade,
  ProUpgradeHeader,
  ProUpgradeTitle,
  ProUpgradeDescription,
  ProUpgradeActions,
} from "@/components/pro-upgrade";
import {
  CatalogImporterLoginButton,
  CatalogMembershipOffer,
  CatalogImporterMembershipButton,
} from "@/components/catalog-builder/membership-actions";
import {
  catalogImporterViewerResponseSchema,
  type CatalogImporterViewerState,
} from "@/lib/catalog-importer-membership";
import { saveTempCatalogImport } from "../_lib/temp-catalog-save";
import type { CultivarMatchCandidate } from "@/lib/catalog-importer";
import type { TempListing } from "../_lib/temp-list";

export function TempCatalogSave({
  listings,
  matches,
  disabled = false,
}: {
  listings: TempListing[];
  matches?: Record<string, CultivarMatchCandidate>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState<{
    projectId: string;
    viewerState: Exclude<CatalogImporterViewerState, "pro">;
  } | null>(null);

  async function prepareSave() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const projectId = await saveTempCatalogImport(listings, matches);
      const response = await fetch("/api/catalog-importer/viewer-state", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok)
        throw new Error("Could not check your account. Try again.");
      const { viewerState } = catalogImporterViewerResponseSchema.parse(
        await response.json(),
      );
      if (viewerState === "pro") {
        router.push("/dashboard/imports");
      } else {
        setMembership({ projectId, viewerState });
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not prepare your import. Try again.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const downloadOnly = [
    ...new Set(
      listings.flatMap((listing) =>
        (listing.extraFields ?? [])
          .filter(({ value }) => value.trim())
          .map(({ label }) => label),
      ),
    ),
  ];
  return (
    <div className="flex w-full flex-col items-start gap-4">
      {downloadOnly.length ? (
        <p className="text-muted-foreground text-sm">
          Download-only fields stay in Playground and your spreadsheet. They are
          not saved to your account. {downloadOnly.join(", ")}
        </p>
      ) : null}
      {membership ? (
        <ProUpgrade className="w-full gap-4 sm:flex-row sm:items-center sm:justify-between">
          <ProUpgradeHeader>
            <ProUpgradeTitle className="text-xl sm:text-xl">
              Save {listings.length}{" "}
              {listings.length === 1 ? "listing" : "listings"} to your account
              with Pro
            </ProUpgradeTitle>
            <ProUpgradeDescription>
              Pro lets you publish your catalog. After checkout, use this
              browser to sign in, review the rows, and import them. Your local
              download stays available.
            </ProUpgradeDescription>
          </ProUpgradeHeader>
          <ProUpgradeActions className="w-full sm:w-auto sm:max-w-sm">
            <CatalogMembershipOffer />
            <CatalogImporterMembershipButton
              ctaId="temp-catalog-save"
              disabled={disabled}
              controller={{
                projectId: membership.projectId,
                storageWarning: null,
                flushDraft: async () => {
                  await saveTempCatalogImport(listings, matches);
                },
              }}
              viewerState={membership.viewerState}
            />
            {membership.viewerState === "anonymous" ? (
              <CatalogImporterLoginButton
                disabled={disabled}
                controller={{
                  flushDraft: async () => {
                    await saveTempCatalogImport(listings, matches);
                  },
                }}
              />
            ) : null}
          </ProUpgradeActions>
        </ProUpgrade>
      ) : (
        <Button
          type="button"
          disabled={disabled || saving || !listings.length}
          onClick={() => void prepareSave()}
        >
          {saving ? <Spinner data-icon="inline-start" /> : null}
          {saving ? "Preparing import…" : "Save to my catalog"}
          {!saving ? <ArrowRight data-icon="inline-end" /> : null}
        </Button>
      )}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
