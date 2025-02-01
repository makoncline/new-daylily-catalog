"use client";

import * as React from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { CatalogNav } from "./catalog-nav";
import { ContentSection } from "./content-section";
import { ImagesSection } from "./images-section";
import { ListsSection } from "./lists-section";
import { ProfileSection } from "./profile-section";
import { APP_CONFIG } from "@/config/constants";

type Profile = RouterOutputs["public"]["getProfile"];

interface ProfileContentProps {
  userSlugOrId: string;
  initialProfile: Profile;
}

export function ProfileContent({
  userSlugOrId,
  initialProfile,
}: ProfileContentProps) {
  const router = useRouter();
  const [data] = api.public.getProfile.useSuspenseQuery(
    { userSlugOrId },
    {
      initialData: initialProfile,
      staleTime: APP_CONFIG.CACHE.PUBLIC_ROUTER.TTL_S * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  const profile = data ?? initialProfile;

  // Handle redirect if we have a slug
  React.useEffect(() => {
    if (profile?.slug && userSlugOrId !== profile.slug) {
      router.replace(`/${profile.slug}`);
    }
  }, [profile?.slug, router, userSlugOrId]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="order-1 sm:order-2 sm:col-span-7">
          <ProfileSection profile={profile} />
        </div>
        <div className="order-2 sm:col-span-12 sm:hidden">
          <CatalogNav />
        </div>
        <div className="order-3 sm:order-1 sm:col-span-5">
          <ImagesSection images={profile.images} />
        </div>
      </div>
      <div className="hidden sm:block">
        <CatalogNav />
      </div>
      <ContentSection content={profile.content} />
      <ListsSection lists={profile.lists} />
    </>
  );
}
