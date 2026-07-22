import { PageHeader } from "@/components/page-header";
import { DashboardCatalogImporterClient } from "./_components/dashboard-catalog-importer-client";

export default function DashboardImportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Import catalog"
        text="Create new listings from a spreadsheet."
      />
      <DashboardCatalogImporterClient />
    </div>
  );
}
