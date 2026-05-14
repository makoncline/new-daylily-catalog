type DashboardProfileMissingField =
  | "hasProfileImage"
  | "description"
  | "content"
  | "location";

interface DashboardListingStats {
  withImages: number;
  withAhsData: number;
  withPrice: number;
  averagePrice: number;
  inLists: number;
}

interface DashboardImageStats {
  total: number;
}

interface DashboardProfileStats {
  completionPercentage: number;
  missingFields: DashboardProfileMissingField[];
}

interface DashboardListStats {
  averageListingsPerList: number;
}

export interface DashboardStats {
  totalListings: number;
  publishedListings: number;
  totalLists: number;
  listingStats: DashboardListingStats;
  imageStats: DashboardImageStats;
  profileStats: DashboardProfileStats;
  listStats: DashboardListStats;
}
