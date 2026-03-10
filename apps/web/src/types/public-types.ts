export interface PublicProfile {
  id: string;
  title: string | null;
  slug: string | null;
  description: string | null;
  location: string | null;
  images: { url: string }[];
  listingCount: number;
  listCount: number;
  hasActiveSubscription: boolean;
  createdAt: Date;
  updatedAt: Date;
  lists: {
    id: string;
    title: string;
    listingCount: number;
  }[];
}
