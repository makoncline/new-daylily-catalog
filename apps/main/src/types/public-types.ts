export type PublicInvalidationReferenceType =
  | "catalogs:index"
  | "cultivar"
  | "listing"
  | "seller";

export interface PublicInvalidationReference {
  referenceId: string;
  referenceType: PublicInvalidationReferenceType;
}

export interface PublicProfile {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  location: string | null;
  images: { id: string; url: string }[];
  listingCount: number;
  listCount: number;
  hasActiveSubscription: boolean;
  createdAt: Date;
  updatedAt: Date;
}
