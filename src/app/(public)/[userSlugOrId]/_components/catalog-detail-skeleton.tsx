"use client";

import { ImageGallerySkeleton } from "@/components/image-gallery";
import { ProfileSectionSkeleton } from "./profile-section";
import { CatalogNavSkeleton } from "./catalog-nav";
import { ListsSectionSkeleton } from "./lists-section";
import { DataTableLayoutSkeleton } from "@/components/data-table/data-table-layout";
import { EditorSkeleton } from "@/components/editor";

export function CatalogDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile and Images Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        {/* Profile Section */}
        <div className="order-1 sm:order-2 sm:col-span-7">
          <ProfileSectionSkeleton />
        </div>

        {/* Mobile Nav (hidden on desktop) */}
        <div className="order-2 sm:col-span-12 sm:hidden">
          <CatalogNavSkeleton />
        </div>

        {/* Images Section */}
        <div className="order-3 sm:order-1 sm:col-span-5">
          <ImageGallerySkeleton />
        </div>
      </div>

      {/* Desktop Nav */}
      <div className="hidden sm:block">
        <CatalogNavSkeleton />
      </div>

      {/* Content Section */}
      <EditorSkeleton />

      {/* Lists Section */}
      <ListsSectionSkeleton />

      {/* Listings Section */}
      <DataTableLayoutSkeleton />
    </div>
  );
}
