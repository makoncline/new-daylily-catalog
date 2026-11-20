"use client";

import { PageHeader } from "@/components/page-header";
import { DashboardCatalogImporterClient } from "./_components/dashboard-catalog-importer-client";

export default function DashboardImportsPage() {
  return (
    <div className="min-w-0">
      <PageHeader
        heading="Importer"
        text="Add new listings from a Playground export."
      />
      <DashboardCatalogImporterClient />
    </div>
  );
}
