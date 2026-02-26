export type DashboardProfileMissingField =
  | "hasProfileImage"
  | "description"
  | "content"
  | "location";

export interface DashboardListingStats {
  withImages: number;
  withAhsData: number;
  withPrice: number;
  averagePrice: number;
  inLists: number;
}

export interface DashboardImageStats {
  total: number;
}

export interface DashboardProfileStats {
  completionPercentage: number;
  missingFields: DashboardProfileMissingField[];
}

export interface DashboardListStats {
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
