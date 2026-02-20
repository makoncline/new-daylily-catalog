import { CatalogListsSection } from "./catalog-lists-section";
import { CatalogListingsSection } from "./catalog-listings-section";
import type { CatalogListsSectionProps } from "./catalog-lists-section";
import type { CatalogListingsSectionProps } from "./catalog-listings-section";

export interface CatalogSeoListingsProps {
  listsSection: CatalogListsSectionProps;
  listingsSection: CatalogListingsSectionProps;
}

export function CatalogSeoListings({
  listsSection,
  listingsSection,
}: CatalogSeoListingsProps) {
  return (
    <div className="space-y-8">
      <CatalogListsSection {...listsSection} />
      <CatalogListingsSection {...listingsSection} />
    </div>
  );
}
