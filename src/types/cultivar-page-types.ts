export interface CultivarPageAhsListing {
  id: string;
  name: string | null;
  ahsImageUrl: string | null;
  hybridizer: string | null;
  year: string | null;
  scapeHeight: string | null;
  bloomSize: string | null;
  bloomSeason: string | null;
  form: string | null;
  ploidy: string | null;
  foliageType: string | null;
  bloomHabit: string | null;
  budcount: string | null;
  branches: string | null;
  sculpting: string | null;
  foliage: string | null;
  flower: string | null;
  fragrance: string | null;
  parentage: string | null;
  color: string | null;
}

export interface CultivarPageListingList {
  id: string;
  title: string;
}

export interface CultivarPageCatalogListing {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  description: string | null;
  updatedAt: Date;
  imageCount: number;
  previewImageUrl: string | null;
  lists: CultivarPageListingList[];
}

export interface CultivarPageCatalog {
  userId: string;
  slug: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
  location: string | null;
  listingCount: number;
  listCount: number;
  hasActiveSubscription: boolean;
  profileImages: Array<{
    id: string;
    url: string;
  }>;
  cultivarUploadedImageCount: number;
  cultivarListings: CultivarPageCatalogListing[];
}

export interface CultivarPageData {
  cultivar: {
    id: string;
    normalizedName: string | null;
    ahsListing: CultivarPageAhsListing | null;
  };
  catalogs: CultivarPageCatalog[];
}
