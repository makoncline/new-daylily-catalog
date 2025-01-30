import { FileText, Image, ListChecks, MapPin, Package } from "lucide-react";
import type { CatalogStep, ProfileStep } from "@/types/dashboard-types";

export const profileSteps: ProfileStep[] = [
  {
    id: "hasProfileImage",
    label: "Add first profile image",
    description: "Upload a profile image to represent your business",
    icon: Image,
  },
  {
    id: "description",
    label: "Add your description",
    description: "Write a short introduction about your daylily business",
    icon: FileText,
  },
  {
    id: "location",
    label: "Add your location",
    description: "Help local customers find you",
    icon: MapPin,
  },
  {
    id: "content",
    label: "Add your content",
    description: "Share your story and expertise with daylilies",
    icon: FileText,
  },
] as const;

export const catalogSteps: CatalogStep[] = [
  {
    id: "create-listings",
    label: "Create 3 listings",
    description: "Add your first few daylilies to your catalog",
    icon: Package,
    target: "/dashboard/listings/new",
    isComplete: (stats) => stats.totalListings >= 3,
  },
  {
    id: "add-listing-image",
    label: "Add a listing image",
    description: "Upload at least one photo of your daylilies",
    icon: Image,
    target: "/dashboard/listings",
    isComplete: (stats) => stats.listingStats.withImages > 0,
  },
  {
    id: "link-ahs",
    label: "Link to daylily database",
    description: "Connect a listing to the AHS database",
    icon: ListChecks,
    target: "/dashboard/listings",
    isComplete: (stats) => stats.listingStats.withAhsData > 0,
  },
  {
    id: "create-list",
    label: "Create a list",
    description: "Organize your daylilies into a collection",
    icon: ListChecks,
    target: "/dashboard/lists/new",
    isComplete: (stats) => stats.totalLists > 0,
  },
  {
    id: "add-to-list",
    label: "Add a listing to a list",
    description: "Add at least one daylily to your list",
    icon: ListChecks,
    target: "/dashboard/lists",
    isComplete: (stats) => {
      const listsWithListings = stats.listStats.averageListingsPerList > 0;
      return listsWithListings;
    },
  },
];
