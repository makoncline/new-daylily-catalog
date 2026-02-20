import { MainContent } from "@/app/(public)/_components/main-content";
import { PublicBreadcrumbs } from "@/app/(public)/_components/public-breadcrumbs";
import { CatalogSearchPrefetch } from "./catalog-search-prefetch";
import { CatalogSeoListings } from "./catalog-seo-listings";
import { ProfileContent } from "./profile-content";
import { ProfilePageSEO } from "./profile-seo";
import type { CatalogSearchPrefetchProps } from "./catalog-search-prefetch";
import type { CatalogSeoListingsProps } from "./catalog-seo-listings";
import type { ProfileContentProps } from "./profile-content";
import type { ProfilePageSEOProps } from "./profile-seo";

export interface PublicProfilePageViewModel {
  canonicalUserSlug: string;
  seo: ProfilePageSEOProps;
  profileContent: ProfileContentProps;
  listings: CatalogSeoListingsProps;
  searchPrefetch: CatalogSearchPrefetchProps;
  breadcrumbProfile: {
    id: string;
    title: string | null;
    slug: string | null;
  };
}

export interface PublicProfilePageShellProps {
  model: PublicProfilePageViewModel;
}

export function PublicProfilePageShell({ model }: PublicProfilePageShellProps) {
  return (
    <>
      <ProfilePageSEO {...model.seo} />

      <MainContent>
        <div className="mb-6">
          <PublicBreadcrumbs profile={model.breadcrumbProfile} />
        </div>

        <div className="space-y-6">
          <ProfileContent {...model.profileContent} />
          <CatalogSeoListings {...model.listings} />
          <CatalogSearchPrefetch {...model.searchPrefetch} />
        </div>
      </MainContent>
    </>
  );
}
