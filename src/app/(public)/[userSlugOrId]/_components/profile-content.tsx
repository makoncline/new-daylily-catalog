"use client";

import * as React from "react";
import { type RouterOutputs } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { CatalogNav } from "./catalog-nav";
import { ContentSection } from "./content-section";
import { ImagesSection } from "./images-section";
import { ListsSection } from "./lists-section";
import { ProfileSection } from "./profile-section";

type Profile = RouterOutputs["public"]["getProfile"];

interface ProfileContentProps {
  initialProfile: Profile;
}

export function ProfileContent({ initialProfile }: ProfileContentProps) {
  const router = useRouter();

  // Handle redirect if we have a slug
  React.useEffect(() => {
    if (initialProfile?.slug) {
      router.replace(`/${initialProfile.slug}`);
    }
  }, [initialProfile?.slug, router]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="order-1 sm:order-2 sm:col-span-7">
          <ProfileSection profile={initialProfile} />
        </div>
        <div className="order-2 sm:col-span-12 sm:hidden">
          <CatalogNav />
        </div>
        <div className="order-3 sm:order-1 sm:col-span-5">
          <ImagesSection images={initialProfile.images} />
        </div>
      </div>
      <div className="hidden sm:block">
        <CatalogNav />
      </div>
      <ContentSection content={initialProfile.content} />
      <ListsSection lists={initialProfile.lists} />
    </>
  );
}
