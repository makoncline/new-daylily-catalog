export interface PublicCultivarSearchResult {
  id: string;
  name: string;
  cultivarReferenceId: string;
  normalizedName: string;
  segment: string;
}

export interface HomeFeaturedCultivar {
  id: string;
  name: string;
  normalizedName: string;
  segment: string;
  imageUrl: string | null;
  hybridizer: string | null;
  year: string | null;
  offerCount: number;
}
