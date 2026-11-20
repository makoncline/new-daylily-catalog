"use client";

import Link from "next/link";
import {
  ProUpgrade,
  ProUpgradeHeader,
  ProUpgradeTitle,
  ProUpgradeDescription,
  ProUpgradeActions,
} from "@/components/pro-upgrade";
import { Button } from "@/components/ui/button";
import {
  CatalogImporterMembershipButton,
  CatalogMembershipOffer,
} from "@/components/catalog-builder/membership-actions";
import { useCatalogImporterSession } from "@/hooks/use-catalog-importer-session";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import { IMPORT_BUILDER_HREF } from "./dashboard-import-config";

export function DashboardImportProGate({
  initialDraft,
}: {
  initialDraft: CatalogImporterDraft | null;
}) {
  const { session, flushDraft, storageWarning } =
    useCatalogImporterSession(initialDraft);
  return (
    <ProUpgrade>
      <ProUpgradeHeader>
        <ProUpgradeTitle>
          Save {session.matchedRows?.length ?? 0}{" "}
          {session.matchedRows?.length === 1 ? "listing" : "listings"} to your
          account with Pro
        </ProUpgradeTitle>
        <ProUpgradeDescription>
          Pro lets you publish your catalog. After checkout, return in this
          browser to review and import the rows. Your local download stays
          available.
        </ProUpgradeDescription>
      </ProUpgradeHeader>
      <ProUpgradeActions className="max-w-sm">
        <CatalogMembershipOffer />
        <CatalogImporterMembershipButton
          controller={{
            projectId: session.projectId,
            flushDraft,
            storageWarning,
          }}
          ctaId="dashboard-import-membership"
          viewerState="signed_in_nonpro"
        />
        <Button asChild variant="outline">
          <Link href={IMPORT_BUILDER_HREF}>Back to Playground</Link>
        </Button>
      </ProUpgradeActions>
    </ProUpgrade>
  );
}
