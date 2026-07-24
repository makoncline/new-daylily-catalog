import { PageHeader } from "@/components/page-header";
import { DashboardCatalogImporterClient } from "./_components/dashboard-catalog-importer-client";

export default function DashboardImportsPage() {
  return (
    <div className="relative">
      <PageHeader
        heading="Import catalog"
        text="Select and create listings from a prepared import."
      />
      <DashboardCatalogImporterClient />
    </div>
  );
}
