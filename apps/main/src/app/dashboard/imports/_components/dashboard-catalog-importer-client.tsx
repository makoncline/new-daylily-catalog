"use client";

import { ProMembershipAction } from "@/components/pro-membership-action";
import {
  ProUpgrade,
  ProUpgradeActions,
  ProUpgradeDescription,
  ProUpgradeHeader,
  ProUpgradeTitle,
} from "@/components/pro-upgrade";
import { Spinner } from "@/components/ui/spinner";
import { usePro } from "@/hooks/use-pro";
import { DashboardCatalogImporter } from "./dashboard-catalog-importer";

export function DashboardCatalogImporterClient() {
  const { isLoading, isPro } = usePro();
  if (isLoading) {
    return (
      <p
        className="text-muted-foreground flex items-center gap-2 py-8 text-sm"
        role="status"
      >
        <Spinner /> Checking your membership…
      </p>
    );
  }
  if (isPro) return <DashboardCatalogImporter />;
  return (
    <ProUpgrade>
      <ProUpgradeHeader>
        <ProUpgradeTitle>Import listings with Pro</ProUpgradeTitle>
        <ProUpgradeDescription>
          Pro lets you add listings to your catalog from a Playground export.
        </ProUpgradeDescription>
      </ProUpgradeHeader>
      <ProUpgradeActions>
        <ProMembershipAction />
      </ProUpgradeActions>
    </ProUpgrade>
  );
}
