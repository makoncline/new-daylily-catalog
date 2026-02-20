import { type OutputData } from "@editorjs/editorjs";
import { CatalogNav } from "./catalog-nav";
import { ContentSection } from "./content-section";
import { ImagesSection } from "./images-section";
import { ProfileSection } from "./profile-section";
import type { ProfileSectionData } from "./profile-section";

export interface ProfileContentProps {
  canonicalUserSlug: string;
  profileSection: ProfileSectionData;
  images: Array<{ id: string; url: string }>;
  profileTitle: string | null;
  content: OutputData | null;
}

export function ProfileContent({
  canonicalUserSlug,
  profileSection,
  images,
  profileTitle,
  content,
}: ProfileContentProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="order-1 sm:order-2 sm:col-span-7">
          <ProfileSection profile={profileSection} />
        </div>
        <div className="order-2 sm:col-span-12 sm:hidden">
          <CatalogNav canonicalUserSlug={canonicalUserSlug} />
        </div>
        <div className="order-3 sm:order-1 sm:col-span-5">
          <ImagesSection
            images={images}
            profileTitle={profileTitle ?? undefined}
          />
        </div>
      </div>
      <div className="hidden sm:block">
        <CatalogNav canonicalUserSlug={canonicalUserSlug} />
      </div>
      <ContentSection content={content} />
    </>
  );
}
