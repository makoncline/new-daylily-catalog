import { PageHeader } from "@/components/page-header";
import { CatalogImporterPublishSetup } from "./catalog-importer-publish-setup";

export default function CatalogImporterPublishSetupPage() {
  return (
    <div className="relative">
      <PageHeader
        heading="Publish setup"
        text="Choose the name and public address buyers will use."
      />
      <CatalogImporterPublishSetup />
    </div>
  );
}
