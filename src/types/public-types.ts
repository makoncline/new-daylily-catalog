export interface PublicProfile {
  id: string;
  name: string | null;
  intro: string | null;
  location: string | null;
  images: { url: string }[];
  listingCount: number;
  listCount: number;
  hasActiveSubscription: boolean;
}
