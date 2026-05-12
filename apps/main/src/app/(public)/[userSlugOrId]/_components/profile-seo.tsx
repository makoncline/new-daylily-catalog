// eslint-disable react/no-danger -- intentional static JSON-LD, style, or compatibility script injection.
import { generateProfilePageJsonLd } from "../_seo/json-ld";
import {
  createBreadcrumbListSchema,
  createUserProfileBreadcrumbs,
} from "@/lib/utils/breadcrumbs";
import { serializeJsonLd } from "@/lib/utils/json-ld";

// Define types using types from the functions directly
type Profile = Parameters<typeof generateProfilePageJsonLd>[0];
type Listings = Parameters<typeof generateProfilePageJsonLd>[1];
type Metadata = Parameters<typeof generateProfilePageJsonLd>[2];

interface ProfilePageSEOProps {
  profile: Profile;
  listings: Listings;
  metadata: Metadata;
  baseUrl: string;
}

export async function ProfilePageSEO({
  profile,
  listings,
  metadata,
  baseUrl,
}: ProfilePageSEOProps) {
  // Create a profile object that includes listings for JSON-LD
  const profileWithListings = {
    ...profile,
    // Make sure lists are included if they exist in profile
    lists: profile.lists || [],
  };

  const jsonLd = await generateProfilePageJsonLd(
    profileWithListings,
    listings,
    metadata,
  );

  // Create breadcrumb schema
  const breadcrumbSchema = createBreadcrumbListSchema(
    baseUrl,
    createUserProfileBreadcrumbs(
      baseUrl,
      profile.title ?? "Daylily Catalog",
      profile.slug ?? profile.id,
      profile.slug ?? profile.id,
    ),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
    </>
  );
}
